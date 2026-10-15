import Link from "next/link";
import { IconBack } from "@/components/Icons";

export const metadata = { title: "第二版进度" };

export default function Page() {
  return (
    <section className="softPage">
      <h1 tabIndex={-1} className="display">
        第二版进度
      </h1>
      <p>
        这里记录已经接入网站的内容，以及仍等待补充的个人资料和作品。
      </p>
      <div className="grid2">
        <section className="panel">
          <h2>已经放进网站</h2>
          <ul className="softList">
            <li>四座岛各有日间和夜间的图。</li>
            <li>环境有横屏和竖屏，云分成近处和远处。</li>
            <li>作品画廊已经接上这些岛图，可以浏览和看大图。</li>
            <li>日间和夜间可以切换。探索、作品、关于、故事和留言都有自己的地址。</li>
            <li>留言会先等待审核，通过后才公开。</li>
            <li>欢迎招呼使用已通过的人物原画，以冷淡、微笑和伸手三种姿态淡入切换。</li>
          </ul>
        </section>
        <section className="panel">
          <h2>还空着</h2>
          <ul className="softList">
            <li>个人介绍、兴趣、工具、经历、故事正文和关键帧都还没有提供。</li>
            <li>真实个人作品还没有放进来。作品页现在用的是本站的岛图。</li>
            <li>可以公开的邮箱和社交账号还没有提供。</li>
            <li>分享图和自托管品牌字体还没有提供。</li>
          </ul>
        </section>
      </div>
      <div className="softActions">
        <Link className="button" href="/hub/">
          <IconBack />
          回到四座岛
        </Link>
      </div>
    </section>
  );
}
