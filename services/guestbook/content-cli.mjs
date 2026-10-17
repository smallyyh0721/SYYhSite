import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createBackup, restoreBackup } from "./content-backup.mjs";
import { normalizeContentConfig } from "./content-config.mjs";
import { importInbox } from "./content-import.mjs";
import { openContentStore } from "./content-store.mjs";
import { hashPassword, writePasswordFile } from "./owner-password.mjs";
import { revokeAllSessions } from "./owner-session.mjs";

const HELP = `用法:
  node content-cli.mjs init-owner
  node content-cli.mjs rotate-owner
  node content-cli.mjs revoke-sessions
  node content-cli.mjs import --inbox <目录> --manifest <清单文件名>
  node content-cli.mjs backup --out <目录>
  node content-cli.mjs restore --backup <备份文件> --to <新数据库>
  node content-cli.mjs help

口令只从标准输入读取，不回显，也不写入日志。
init-owner / rotate-owner 需要 OWNER_PASSWORD_FILE。
rotate-owner 与 revoke-sessions 需要 CONTENT_DB_PATH，并撤销全部会话。
import 需要 CONTENT_DB_PATH、STAGING_ROOT、DERIVED_ROOT、STORE_ID、PUBLIC_ORIGIN、OWNER_PASSWORD_FILE、COS_SITE_ROOT。
清单路径必须位于 inbox 内，拒绝绝对路径、.. 和符号链接。导入只创建草稿，不会发布。
backup 需要 CONTENT_DB_PATH。若 DB_PATH 指向已有留言库，会另写一份留言备份。
备份不覆盖同名文件。超过 7 份日备份或 4 份周备份时只报告，不删除。
restore 写到新文件并撤销该副本里的会话，不会切换正在使用的数据库。
可选 FFMPEG_PATH / FFPROBE_PATH。ALLOW_INSECURE_DEV=1 只允许本机 HTTP 开发来源。
`;

function option(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1 || index + 1 >= argv.length) return null;
  const value = argv[index + 1];
  if (value.startsWith("--")) return null;
  return value;
}

async function readSecret() {
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
  }
  process.stderr.write("口令: ");
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let data = "";
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") process.exit(1);
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stderr.write("\n");
          resolve(data);
          return;
        }
        if (char === "\u007f" || char === "\b") {
          data = data.slice(0, -1);
          continue;
        }
        data += char;
      }
    };
    stdin.on("data", onData);
    stdin.on("error", reject);
  });
}

function contentConfig() {
  return normalizeContentConfig({
    dbPath: process.env.CONTENT_DB_PATH,
    publicOrigin: process.env.PUBLIC_ORIGIN,
    ownerPasswordFile: process.env.OWNER_PASSWORD_FILE,
    derivedRoot: process.env.DERIVED_ROOT,
    storeId: process.env.STORE_ID,
    stagingRoot: process.env.STAGING_ROOT,
    allowInsecureDev: process.env.ALLOW_INSECURE_DEV === "1",
    cosSiteRoot: process.env.COS_SITE_ROOT || null,
    guestbookDbPath: process.env.DB_PATH || null,
  });
}

async function writeOwner(rotate) {
  const file = process.env.OWNER_PASSWORD_FILE;
  if (!file) throw new Error("缺少配置 OWNER_PASSWORD_FILE");
  if (rotate && !process.env.CONTENT_DB_PATH) throw new Error("缺少配置 CONTENT_DB_PATH");
  if (!rotate && existsSync(file)) {
    throw new Error("口令哈希已存在。要更换请使用 rotate-owner。");
  }
  if (rotate && !existsSync(file)) throw new Error("还没有口令哈希，请先 init-owner。");
  const encoded = await hashPassword(await readSecret());
  writePasswordFile(file, encoded);
  if (process.env.CONTENT_DB_PATH) {
    const db = openContentStore(process.env.CONTENT_DB_PATH);
    try {
      revokeAllSessions(db, Date.now());
    } finally {
      db.close();
    }
  }
  console.log(rotate ? "已更新口令哈希并撤销全部会话。" : "已写入口令哈希。");
}

async function main(argv) {
  const command = argv[0] || "help";
  if (command === "help" || command === "--help" || command === "-h") {
    console.log(HELP);
    return;
  }
  if (command === "init-owner") return writeOwner(false);
  if (command === "rotate-owner") return writeOwner(true);
  if (command === "revoke-sessions") {
    if (!process.env.CONTENT_DB_PATH) throw new Error("缺少配置 CONTENT_DB_PATH");
    const db = openContentStore(process.env.CONTENT_DB_PATH);
    try {
      revokeAllSessions(db, Date.now());
    } finally {
      db.close();
    }
    console.log("已撤销全部会话。");
    return;
  }
  if (command === "import") {
    const config = contentConfig();
    if (!config.cosSiteRoot) throw new Error("媒体处理配置不完整：COS_SITE_ROOT");
    const db = openContentStore(config.dbPath);
    try {
      const result = await importInbox({
        db,
        config,
        inbox: option(argv, "--inbox"),
        manifest: option(argv, "--manifest"),
        worker: {
          cosSiteRoot: config.cosSiteRoot,
          ffmpegPath: process.env.FFMPEG_PATH || "",
          ffprobePath: process.env.FFPROBE_PATH || "",
        },
      });
      console.log(JSON.stringify(result));
    } finally {
      db.close();
    }
    return;
  }
  if (command === "backup") {
    const out = option(argv, "--out") || process.env.BACKUP_DIR;
    if (!out) throw new Error("需要 --out 或 BACKUP_DIR。");
    if (!process.env.CONTENT_DB_PATH) throw new Error("缺少配置 CONTENT_DB_PATH");
    const result = await createBackup({
      contentDbPath: process.env.CONTENT_DB_PATH,
      guestbookDbPath: process.env.DB_PATH || "",
      outDir: out,
      storeId: process.env.STORE_ID || "",
    });
    if (result.quota.exceeded) {
      console.error(
        `备份数量超过保留建议（日备份 ${result.quota.daily}/${result.quota.dailyMax}，周备份 ${result.quota.weekly}/${result.quota.weeklyMax}）。本次未删除任何文件。`,
      );
    }
    console.log(JSON.stringify(result));
    return;
  }
  if (command === "restore") {
    const result = await restoreBackup({
      backupFile: option(argv, "--backup"),
      destination: option(argv, "--to"),
    });
    console.log(JSON.stringify(result));
    return;
  }
  throw new Error("未知命令。使用 help 查看用法。");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(error?.message || "命令失败。");
    process.exit(error?.code === "slug_conflict" ? 2 : 1);
  }
}
