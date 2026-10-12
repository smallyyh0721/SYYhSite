import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "../services/guestbook/server.mjs";
import { openStore } from "../services/guestbook/store.mjs";
test("moderation isolation, idempotency conflict, Unicode validation and throttling", async () => {
  const app = createServer({ dbPath: ":memory:", rateLimit: 1 });
  const payload = {
    callsign: "测试访客",
    message: "<script>alert(1)</script> ✨",
  };
  const send = (body, key) =>
    app.inject({
      method: "POST",
      url: "/api/messages",
      headers: { "idempotency-key": key },
      payload: body,
    });
  try {
    const first = await send(payload, "original-request-0001");
    assert.equal(first.statusCode, 201);
    assert.deepEqual((await app.inject("/api/messages")).json().entries, []);
    assert.equal(
      (await send(payload, "original-request-0001")).json().duplicate,
      true,
    );
    assert.equal(
      (await send({ ...payload, message: "changed" }, "original-request-0001"))
        .statusCode,
      409,
    );
    assert.equal(
      (
        await send(
          { ...payload, message: "✨".repeat(141) },
          "original-request-0002",
        )
      ).statusCode,
      400,
    );
    assert.equal(
      (await send(payload, "original-request-0002")).statusCode,
      429,
    );
  } finally {
    await app.close();
  }
});
test("approved messages survive restart and rejected entries stay private", async () => {
  const dir = mkdtempSync(join(tmpdir(), "syyh-api-"));
  const path = join(dir, "messages.sqlite");
  let app = createServer({ dbPath: path });
  try {
    await app.inject({
      method: "POST",
      url: "/api/messages",
      headers: { "idempotency-key": "persist-test-00001" },
      payload: { callsign: "🙂", message: "真实持久化测试" },
    });
    await app.close();
    const db = openStore(path);
    db.prepare("UPDATE messages SET status='approved' WHERE id=1").run();
    db.close();
    app = createServer({ dbPath: path });
    const entries = (await app.inject("/api/messages")).json().entries;
    assert.equal(entries.length, 1);
    assert.equal(entries[0].message, "真实持久化测试");
    assert.equal(entries[0].callsign, "🙂");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
