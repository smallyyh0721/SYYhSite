"use client";
import Link from "next/link";
export default function WorksError({ reset }: { reset: () => void }) {
  return <section className="softPage"><h1 className="display" tabIndex={-1}>作品暂时未能载入</h1><p className="muted">连接没有完成，稍后可以再试一次。</p><div className="softActions"><button className="button" onClick={reset}>重新加载</button><Link href="/hub/" className="button secondary">返回四岛</Link></div></section>;
}
