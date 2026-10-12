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
      setStatus("信号已送达。留言正在等待审核，通过后会出现在这里。");
      setMessage("");
      payload.current = "";
      key.current = "";
    } catch (e) {
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
          <div className="eyebrow">CH-04 / LEAVE A SIGNAL</div>
          <h1 tabIndex={-1} className="display">
            STAY IN
            <br />
            TOUCH.
          </h1>
        </div>
        <p>
          留下一点声音，
          <br />
          让这次相遇有迹可循。
        </p>
      </div>
      <div className={styles.layout}>
        <aside>
          <h2 className={styles.title}>LET’S CONNECT.</h2>
          <p className="muted">
            这里将放置 SYYH 的联系方式。
            <br />
            真实账号和邮箱还在整理。
          </p>
          <div className={styles.contact}>
            <span>01 / CONTACT</span>
            <span>待补充</span>
          </div>
          <div className={styles.contact}>
            <span>02 / SOCIAL</span>
            <span>待补充</span>
          </div>
          <p className={styles.small}>
            本页为公开 draft。请勿在留言中填写私人联系方式；留言经审核后公开。
          </p>
        </aside>
        <section aria-labelledby="board-form-title">
          <div className={styles.formHeader}>
            <h2 id="board-form-title">SEND A SIGNAL</h2>
            <span>140 CHAR MAX</span>
          </div>
          <form onSubmit={submit}>
            <label htmlFor="board-name">CALLSIGN / 昵称（可选）</label>
            <input
              id="board-name"
              placeholder="访客"
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
            <label htmlFor="board-message">MESSAGE / 想说的话</label>
            <textarea
              id="board-message"
              rows={5}
              required
              value={message}
              onChange={(e) =>
                setMessage([...e.target.value].slice(0, 140).join(""))
              }
              placeholder="向这个频道发送一句话…"
              aria-describedby="message-count"
            />
            <div className={styles.submit}>
              <span id="message-count">{[...message].length} / 140</span>
              <button
                className="button"
                type="submit"
                disabled={sending || !message.trim()}
              >
                {sending ? "发送中…" : "TRANSMIT ↗"}
              </button>
            </div>
            <p aria-live="polite" className={styles.feedback}>
              {status || "审核通过后公开。昵称与留言以纯文本保存。"}
            </p>
          </form>
        </section>
      </div>
      <section className={styles.messages} aria-labelledby="messages-title">
        <div className={styles.formHeader}>
          <h2 id="messages-title">RECEIVED SIGNALS</h2>
          <span>PUBLIC / 已审核</span>
        </div>
        {loading ? (
          <p className="muted">正在接收信号…</p>
        ) : loadError ? (
          <div className="panel">
            <p>暂时无法接收留言。</p>
            <button className="button secondary" onClick={() => void load()}>
              重新连接
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className={styles.empty}>
            <span>NO SIGNALS YET.</span>
            <p>这里还很安静。成为第一位发送信号的人吧。</p>
          </div>
        ) : (
          <div>
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
