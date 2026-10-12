import { openStore } from "./store.mjs";
import { resolve } from "node:path";
const db = openStore(process.env.DB_PATH || "./data/guestbook.sqlite");
const [action, id] = process.argv.slice(2);
try {
  if (action === "list")
    console.log(
      JSON.stringify(
        db
          .prepare(
            "SELECT id,callsign,message,status,created_at FROM messages ORDER BY id DESC LIMIT 100",
          )
          .all(),
        null,
        2,
      ),
    );
  else if (["approve", "reject"].includes(action) && /^\d+$/.test(id || "")) {
    const result = db
      .prepare("UPDATE messages SET status=? WHERE id=?")
      .run(action === "approve" ? "approved" : "rejected", Number(id));
    if (!result.changes) throw Error("ID not found");
    console.log(action, id);
  } else if (action === "backup" && id) {
    const path = resolve(id);
    db.exec("VACUUM INTO " + "'" + path.replaceAll("'", "''") + "'");
    console.log("Backup written", path);
  } else
    throw Error(
      "Usage: node moderate.mjs list | approve ID | reject ID | backup /data/backups/file.sqlite",
    );
} finally {
  db.close();
}
