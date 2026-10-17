"use client";
import { useEffect, useRef, useState } from "react";
import type { GuestbookEntry } from "@/lib/contracts";
import styles from "./Board.module.css";
function makeKey() {
  return (
    "msg-" +
    (globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`)
  );
}
export default function Board() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [tone, setTone] = useState<"idle" | "ok" | "err">("idle");
  const [sending, setSending] = useState(false);
  const key = useRef("");
  const payload = useRef("");
  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(false);
    const deadline = new AbortController();
    const cancel = () => deadline.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(cancel, 10000);
    try {
      const result = await fetch("/api/messages", {
        signal: deadline.signal,
        cache: "no-store",
      });
      if (!result.ok) throw Error();
      setEntries((await result.json()).entries);
    } catch (e) {
      if (!signal?.aborted) setLoadError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    }
  };
  useEffect(() => {
    try {
      setName(sessionStorage.getItem("syyh-callsign") || "");
    } catch {}
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const website = String(new FormData(e.currentTarget).get("website") || "");
    const body = { callsign: name.trim(), message: message.trim(), website };
    const serialized = JSON.stringify(body);
    if (serialized !== payload.current) {
      payload.current = serialized;
      key.current = makeKey();
    }
    setSending(true);
    setStatus("");
    setTone("idle");
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), 12000);
    try {
      const result = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key.current,
        },
        body: serialized,
        signal: deadline.signal,
      });
      const data = await result.json();
      if (!result.ok) throw Error(data.error || "发送失败，请重试。");
      setTone("ok");
      setStatus("已经收到。这条留言正在等待审核，通过后才会出现在这里。");
      setMessage("");
      payload.current = "";
      key.current = "";
    } catch (e) {
      setTone("err");
      setStatus(
        (e as Error).name === "AbortError"
          ? "连接超时，请重试。"
          : (e as Error).message || "网络暂时不可用，请重试。",
      );
    } finally {
      setSending(false);
      clearTimeout(timer);
    }
  };
  return (
    <>
      <div className="pageHeading">
        <div>
          <h1 tabIndex={-1} className="display">
            留言
          </h1>
        </div>
        <p>想说的话可以留在这里。审核通过以后才会公开。</p>
      </div>
      <div className={styles.layout}>
        <aside>
          <h2 className={styles.title}>联系</h2>
          <p className="muted">作品之外，也可以在小红书遇见我。</p>
          <div className={styles.contact}>
            <span>小红书</span>
            <a href="https://www.xiaohongshu.com/user/profile/69aa2b070000000033033a92" target="_blank" rel="noopener noreferrer">打开主页 ↗</a>
          </div>
          <p className={styles.small}>请不要在留言里写下自己的私人联系方式。</p>
        </aside>
        <section className={styles.formCard} aria-labelledby="board-form-title">
          <div className={styles.formHeader}>
            <h2 id="board-form-title">写一句</h2>
            <span>最多 140 个字</span>
          </div>
          <form onSubmit={submit}>
            <label htmlFor="board-name">昵称，可选</label>
            <input
              id="board-name"
              placeholder="可以不填"
              autoComplete="nickname"
              value={name}
              onChange={(e) =>
                setName([...e.target.value].slice(0, 24).join(""))
              }
            />
            <div className={styles.honey} aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <label htmlFor="board-message">留言</label>
            <textarea
              id="board-message"
              rows={5}
              required
              value={message}
              onChange={(e) =>
                setMessage([...e.target.value].slice(0, 140).join(""))
              }
              placeholder="写一句想说的话"
              aria-describedby="message-count"
            />
            <div className={styles.submit}>
              <span id="message-count">{[...message].length} / 140</span>
              <button
                className="button"
                type="submit"
                disabled={sending || !message.trim()}
                aria-busy={sending}
              >
                {sending ? "正在发送" : "发送"}
              </button>
            </div>
            <p aria-live="polite" className={styles.feedback} data-tone={tone}>
              {status || "审核通过后才会公开。昵称和留言按纯文本保存。"}
            </p>
          </form>
        </section>
      </div>
      <section className={styles.messages} aria-labelledby="messages-title">
        <div className={styles.formHeader}>
          <h2 id="messages-title">公开的留言</h2>
          <span>只显示审核通过的</span>
        </div>
        {loading ? (
          <p className="muted" data-messages="loading">正在读取留言。</p>
        ) : loadError ? (
          <div className="panel" data-messages="error">
            <p>暂时没有读到留言。</p>
            <button type="button" className="button secondary" onClick={() => void load()}>
              再试一次
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className={styles.empty} data-messages="empty">
            <span>还没有公开的留言</span>
            <p>审核通过的留言会显示在这里。</p>
          </div>
        ) : (
          <div data-messages="list">
            {entries.map((entry) => (
              <article className={styles.entry} key={entry.id}>
                <div>
                  <b>{entry.callsign}</b>
                  <time dateTime={entry.createdAt}>
                    {entry.createdAt.slice(0, 10)}
                  </time>
                </div>
                <p>{entry.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
