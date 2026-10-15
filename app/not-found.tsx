import Link from "next/link";
import { IconBack } from "@/components/Icons";

export default function NotFound() {
  return (
    <section className="softPage">
      <h1 tabIndex={-1} className="display">
        这一页不存在
      </h1>
      <p className="muted">没有这个地址。可以回到四座岛，或者去看作品。</p>
      <div className="softActions">
        <Link className="button" href="/hub/">
          <IconBack />
          回到四座岛
        </Link>
        <Link className="button secondary" href="/works/">
          看作品
        </Link>
      </div>
    </section>
  );
}
