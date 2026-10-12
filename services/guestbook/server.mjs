import Fastify from "fastify";
import { openStore } from "./store.mjs";
import { fileURLToPath } from "node:url";
export function createServer({
  dbPath = process.env.DB_PATH || "./data/guestbook.sqlite",
  logger = false,
  rateLimit = 5,
  rateWindowMs = 600000,
} = {}) {
  const app = Fastify({ logger, bodyLimit: 4096, trustProxy: 1 });
  const db = openStore(dbPath);
  const attempts = new Map();
  app.addHook("onClose", async () => db.close());
  app.get("/api/health", async () => {
    db.prepare("SELECT 1").get();
    return { status: "ok" };
  });
  app.get("/api/messages", async (_, reply) => {
    reply.header("Cache-Control", "no-store");
    return {
      entries: db
        .prepare(
          "SELECT id,callsign,message,created_at AS createdAt FROM messages WHERE status='approved' ORDER BY id DESC LIMIT 100",
        )
        .all(),
    };
  });
  app.post("/api/messages", async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    const body = req.body;
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      typeof body.message !== "string" ||
      typeof body.callsign !== "string" ||
      (body.website ?? "") !== ""
    )
      return reply.code(400).send({ error: "请填写有效的昵称和留言。" });
    const callsign = body.callsign.trim() || "访客";
    const message = body.message.trim();
    const key = req.headers["idempotency-key"];
    if (typeof key !== "string" || !/^[-a-zA-Z0-9]{16,80}$/.test(key))
      return reply.code(400).send({ error: "提交标识无效，请刷新后重试。" });
    if (
      [...callsign].length > 24 ||
      [...message].length < 1 ||
      [...message].length > 140 ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(callsign + message)
    )
      return reply
        .code(400)
        .send({ error: "昵称最多24个字符，留言需要1–140个字符。" });
    const prior = db
      .prepare(
        "SELECT id,callsign,message FROM messages WHERE idempotency_key=?",
      )
      .get(key);
    if (prior) {
      if (prior.callsign !== callsign || prior.message !== message)
        return reply
          .code(409)
          .send({ error: "这次提交已变更，请发起新的留言。" });
      return { id: prior.id, status: "pending", duplicate: true };
    }
    const now = Date.now();
    for (const [ip, value] of attempts) {
      if (value.until <= now) attempts.delete(ip);
    }
    const bucket = attempts.get(req.ip) || {
      count: 0,
      until: now + rateWindowMs,
    };
    if (bucket.count >= rateLimit || attempts.size >= 10000) {
      reply.header(
        "Retry-After",
        Math.max(1, Math.ceil((bucket.until - now) / 1000)),
      );
      return reply.code(429).send({ error: "发送得太快，请稍后再来。" });
    }
    if (
      db
        .prepare("SELECT count(*) AS n FROM messages WHERE status='pending'")
        .get().n >= 5000
    )
      return reply.code(503).send({ error: "信号队列已满，请稍后再来。" });
    bucket.count++;
    attempts.set(req.ip, bucket);
    const result = db
      .prepare(
        "INSERT INTO messages(callsign,message,idempotency_key) VALUES(?,?,?)",
      )
      .run(callsign, message, key);
    return reply
      .code(201)
      .send({ id: Number(result.lastInsertRowid), status: "pending" });
  });
  app.setErrorHandler((error, req, reply) => {
    req.log.error(error);
    reply
      .code(
        error.statusCode >= 400 && error.statusCode < 500
          ? error.statusCode
          : 500,
      )
      .send({
        error:
          error.statusCode === 413
            ? "留言过长。"
            : error.statusCode === 400
              ? "请求格式无效。"
              : "服务暂时不可用，请稍后重试。",
      });
  });
  return app;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = createServer({ logger: true });
  await app.listen({ port: Number(process.env.PORT || 3001), host: "0.0.0.0" });
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, async () => {
      await app.close();
      process.exit(0);
    });
}
