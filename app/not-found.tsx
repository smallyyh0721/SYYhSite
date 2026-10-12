import Link from "next/link";
export default function NotFound() {
  return (
    <section style={{ padding: "80px 0" }}>
      <div className="eyebrow">404 / LOST TRANSMISSION</div>
      <h1 tabIndex={-1} className="display">
        NO SIGNAL.
      </h1>
      <p className="muted">这个频道还没有接通。</p>
      <Link className="button" href="/hub/">
        返回探索 ↗
      </Link>
      <Link
        className="button secondary"
        style={{ marginLeft: 16 }}
        href="/works/"
      >
        查看作品
      </Link>
    </section>
  );
}
