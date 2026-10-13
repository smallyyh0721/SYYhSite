import Link from "next/link";
export const metadata = { title: "修正版 Draft 状态" };
export default function Page() {
  return (
    <>
      <div className="eyebrow">REVISED DRAFT / NOT FINAL</div>
      <h1 tabIndex={-1} className="display">
        A WORK
        <br />
        IN PROGRESS.
      </h1>
      <p>
        这是修正版设计 draft，正式网站尚未完成。欢迎、连接招呼、四岛和主题作品按这一版方案接通；正式人物、真实作品和素材仍待补齐。
      </p>
      <div className="grid2">
        <section className="panel">
          <h2>这一版已接通</h2>
          <ul>
            <li>
              欢迎页的 WELCOME TO MY WORLD. 和 CONNECT 居中，第一屏不显示人物。入口不要求填写昵称。
            </li>
            <li>
              点下连接之后才出现招呼。真 3D 只在招呼里出现，并看向鼠标。正式人物身份和模型仍未确定；人物未能加载时改用海报。
            </li>
            <li>
              四岛排在菱形轨道上。指针在岛图上停留约 260 毫秒后才聚焦。选中的岛沿大约 1.35 秒的弧线移到中央前景。
            </li>
            <li>
              手机先点一下选中岛，再点一次才进入。桌面悬停切换聚焦，点击岛图查看作品。岛的运动本身不切换焦点。
            </li>
            <li>背景保持动态，并可以暂停。减少动态时动画让路。</li>
            <li>
              四座岛分别进入天空、远古、末日和宅岛的主题作品。关于、故事和留言只在顶部菜单。
            </li>
            <li>全站 Day / Night，以及作品、关于、故事、留言的真实页面地址。</li>
            <li>真实留言会保存，审核通过后才公开。</li>
          </ul>
        </section>
        <section className="panel">
          <h2>仍待补充</h2>
          <ul>
            <li>正式人物身份、最终模型与海报。</li>
            <li>同轮廓的日夜双光照、精细分层，以及完整 3D 岛屿。这些尚未选定制作。</li>
            <li>真实个人作品、过程图、自述与联系方式。当前条目是本站设计研究。</li>
            <li>故事正文和正式关键帧。完整动画序列尚未选定。</li>
            <li>自托管品牌字体与音效。</li>
            <li>正式域名、HTTPS 与分享图。</li>
          </ul>
        </section>
      </div>
      <p className="muted" style={{ marginTop: 32 }}>
        现有作品条目是本站浮岛设计研究，真实个人作品待录入。关于页的代理人物并非正式身份。音效未提供，本站保持静音。此页只说明修正版 draft 的现状。
      </p>
      <Link className="button" href="/hub/">
        继续探索 ↗
      </Link>
    </>
  );
}
