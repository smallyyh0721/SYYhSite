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
        这是修正版设计 draft，正式网站尚未完成。入口、四岛和日夜画面按这一版方案接通；正式人物、作品和素材仍待补齐。
      </p>
      <div className="grid2">
        <section className="panel">
          <h2>这一版已接通</h2>
          <ul>
            <li>
              入口依次为欢迎、CONNECT、HELLO STRANGER，然后进入 Hub。入口不要求填写昵称。
            </li>
            <li>
              真 3D 代理人物以透明画布融进背景，并看向鼠标。正式人物身份和模型仍未确定；人物未能加载时改用海报。
            </li>
            <li>
              Hub 为全屏 2.5D 四岛。鼠标进入整张岛图会立即聚焦、点亮并居中，其余岛变为灰色。点击岛图进入频道；键盘可聚焦该岛，按 Enter 进入；手机点岛进入。
            </li>
            <li>
              四座岛接透明背景的 draft 前景。日夜共用同一套岛轮廓，并用样式调光；日夜环境图分开。这些画面若没有出现，点击岛位仍可进入频道。
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
            <li>真实作品、过程图、自述与联系方式。</li>
            <li>故事正文和正式关键帧。完整动画序列尚未选定。</li>
            <li>自托管品牌字体与音效。</li>
            <li>正式域名、HTTPS 与分享图。</li>
          </ul>
        </section>
      </div>
      <p className="muted" style={{ marginTop: 32 }}>
        四岛与频道仍临时绑定为 Works / About / Story /
        Board，等待确认。现有作品条目是本站浮岛设计研究；关于页的代理人物并非正式身份。音效未提供，本站保持静音。此页只说明修正版 draft 的现状。
      </p>
      <Link className="button" href="/hub/">
        继续探索 ↗
      </Link>
    </>
  );
}
