import Link from "next/link";
export const metadata = { title: "Draft状态与素材清单" };
export default function Page() {
  return (
    <>
      <div className="eyebrow">STAGE 01 / DRAFT V1</div>
      <h1 tabIndex={-1} className="display">
        A WORK
        <br />
        IN PROGRESS.
      </h1>
      <p>
        这是第一版可运行设计 draft。用于检验页面、交互与部署，欢迎留下反馈。
      </p>
      <div className="grid2">
        <section className="panel">
          <h2>已接通信号</h2>
          <ul>
            <li>全站 Day / Night 主题与真实页面地址</li>
            <li>入口 3D 代理人物、鼠标跟随与海报降级</li>
            <li>四岛 2.5D 探索、聚焦进入与返回</li>
            <li>作品设计研究、关于、故事和留言</li>
            <li>真实留言存储，审核后公开</li>
          </ul>
        </section>
        <section className="panel">
          <h2>待补充素材</h2>
          <ul>
            <li>正式人物形象、最终模型与海报</li>
            <li>四岛同轮廓的透明分层 Day / Night 运行图</li>
            <li>真实作品、过程图、自述与联系方式</li>
            <li>故事正文及正式关键帧；完整动画序列尚未选定</li>
            <li>自托管品牌字体与可选音效</li>
            <li>正式域名、HTTPS 与分享图</li>
          </ul>
        </section>
      </div>
      <p className="muted" style={{ marginTop: 32 }}>
        四岛与频道暂按 Works / About / Story / Board
        绑定，等待后续确认。现有作品条目是本站浮岛设计研究；关于页的代理人物并非正式身份。音效未提供，本站保持静音。
      </p>
      <Link className="button" href="/hub/">
        继续探索 ↗
      </Link>
    </>
  );
}
