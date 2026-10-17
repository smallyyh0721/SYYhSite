"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { workThemes, type Work } from "@/lib/contracts";
import type { DraftMedia, OwnerAsset, OwnerSession, OwnerWork, WorkDraft } from "@/lib/owner-types";
import WorkDetail from "@/features/content/WorkDetail";
import styles from "./Owner.module.css";

class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
async function request<T>(path: string, csrf?: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/owner${path}`, {
    method, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(30000),
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(csrf ? { "X-CSRF-Token": csrf } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || `请求未完成（${response.status}）`, response.status);
  return data;
}
const freshDraft = (order: number): WorkDraft => ({ slug: `work-${Date.now().toString(36)}`, themeId: "sky", title: "未命名作品", subtitle: "", category: "图片创作", description: "", sortOrder: order, coverAssetId: null, media: [], processMedia: [] });
const statusLabel = { queued: "等待处理", processing: "正在处理", ready: "可以使用", error: "处理失败" };
const LIMIT = 30 * 1024 * 1024;

export default function OwnerConsole() {
  const [session, setSession] = useState<OwnerSession | null>(null);
  const [password, setPassword] = useState("");
  const [works, setWorks] = useState<OwnerWork[]>([]);
  const [assets, setAssets] = useState<OwnerAsset[]>([]);
  const [record, setRecord] = useState<OwnerWork | null>(null);
  const [draft, setDraft] = useState<WorkDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [storage, setStorage] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<Work | null>(null);
  const [transfer, setTransfer] = useState<{ name: string; percent: number } | null>(null);
  const uploadRequest = useRef<XMLHttpRequest | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const csrf = session?.csrfToken;

  const failed = useCallback((cause: unknown) => {
    if (cause instanceof ApiError && cause.status === 401) setSession({ authenticated: false });
    setError(cause instanceof Error ? cause.message : "连接未完成，请重试。");
  }, []);
  const refresh = useCallback(async () => {
    const [list, media, health] = await Promise.all([
      request<{ works: OwnerWork[] }>("/works"), request<{ assets: OwnerAsset[] }>("/assets"),
      request<{ available: boolean }>("/storage"),
    ]);
    setWorks(list.works); setAssets(media.assets); setStorage(health.available);
  }, []);
  useEffect(() => { request<OwnerSession>("/session").then(setSession).catch(cause => { setSession({ authenticated: false }); failed(cause); }); }, [failed]);
  useEffect(() => {
    if (!session?.authenticated) return;
    refresh().catch(failed);
    const timer = setInterval(() => { if (document.visibilityState === "visible") request<OwnerSession>("/session").then(setSession).catch(failed); }, 240000);
    return () => clearInterval(timer);
  }, [session?.authenticated, refresh, failed]);
  const hasPending = assets.some(asset => asset.status === "queued" || asset.status === "processing");
  useEffect(() => {
    if (!session?.authenticated || (!hasPending && !transfer)) return;
    const timer = setInterval(() => { request<{ assets: OwnerAsset[] }>("/assets").then(data => setAssets(data.assets)).catch(failed); }, 2500);
    return () => clearInterval(timer);
  }, [session?.authenticated, hasPending, Boolean(transfer), failed]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  useEffect(() => () => uploadRequest.current?.abort(), []);

  const change = <K extends keyof WorkDraft>(key: K, value: WorkDraft[K]) => { setDraft(current => current ? { ...current, [key]: value } : null); setDirty(true); };
  const chooseWork = (work: OwnerWork | null) => {
    if (dirty && !window.confirm("有尚未保存的修改，离开这个作品？")) return;
    setRecord(work); setDraft(work ? structuredClone(work.draft) : freshDraft(works.length + 1)); setDirty(false); setPreview(null); setError(""); setNotice("");
  };
  const save = async (): Promise<OwnerWork> => {
    if (!draft) throw new Error("请先选择或新建作品。");
    const result = record
      ? await request<{ work: OwnerWork }>(`/works/${record.id}`, csrf, "PUT", { revision: record.revision, draft })
      : await request<{ work: OwnerWork }>("/works", csrf, "POST", { draft });
    setRecord(result.work); setDraft(result.work.draft); setDirty(false);
    setWorks(current => [...current.filter(work => work.id !== result.work.id), result.work].sort((a, b) => a.draft.sortOrder - b.draft.sortOrder));
    return result.work;
  };
  const action = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await operation(); } catch (cause) { failed(cause); } finally { setBusy(false); }
  };
  const publish = () => action(async () => {
    const current = dirty || !record ? await save() : record;
    const result = await request<{ work: OwnerWork }>(`/works/${current.id}/publish`, csrf, "POST", { revision: current.revision });
    setRecord(result.work); setNotice("已发布，访客现在可以看到这件作品。"); await refresh();
  });
  const unpublish = () => action(async () => {
    if (!record) return;
    const result = await request<{ work: OwnerWork }>(`/works/${record.id}/unpublish`, csrf, "POST", { revision: record.revision });
    setRecord(result.work); setNotice("已撤下。素材和草稿保留，可以继续修改后重新发布。"); await refresh();
  });
  const openPreview = () => action(async () => {
    const current = dirty || !record ? await save() : record;
    const result = await request<{ work: Work }>(`/works/${current.id}/preview`);
    setPreview(result.work); setNotice("仅登录站主可见的草稿预览。");
  });
  const addAsset = (asset: OwnerAsset, role: "media" | "processMedia") => {
    if (!draft) return;
    if ([...draft.media, ...draft.processMedia].some(item => item.assetId === asset.id)) return;
    const item: DraftMedia = { assetId: asset.id, alt: asset.filename.replace(/\.[^.]+$/, ""), caption: "" };
    setDraft(current => current ? { ...current, [role]: [...current[role], item], coverAssetId: current.coverAssetId || (asset.status === "ready" && asset.kind !== "video" ? asset.id : null) } : null); setDirty(true);
  };
  const uploadOne = (file: File): Promise<OwnerAsset> => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); uploadRequest.current = xhr;
    xhr.open("POST", `/api/owner/uploads?filename=${encodeURIComponent(file.name)}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    if (csrf) xhr.setRequestHeader("X-CSRF-Token", csrf);
    xhr.timeout = 180000;
    xhr.upload.onprogress = event => { if (event.lengthComputable) setTransfer({ name: file.name, percent: Math.round(event.loaded / event.total * 100) }); };
    xhr.onerror = () => reject(new Error("上传连接中断，请重试这个文件。"));
    xhr.ontimeout = () => reject(new Error("上传超时，请重试这个文件。"));
    xhr.onabort = () => reject(new Error("上传已取消。"));
    xhr.onload = () => {
      let data: { asset?: OwnerAsset; error?: string } = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status < 200 || xhr.status >= 300 || !data.asset) reject(new ApiError(data.error || `上传未完成（${xhr.status}）`, xhr.status));
      else resolve({ ...data.asset, filename: data.asset.filename || file.name });
    };
    setTransfer({ name: file.name, percent: 0 }); xhr.send(file);
  });
  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length || transfer) return;
    setError(""); setNotice("");
    for (const file of Array.from(files)) {
      try {
        if (file.size > LIMIT || file.size === 0) throw new Error(`${file.name}：单个文件需大于0且不超过30MiB。`);
        if (!/\.(jpe?g|png|webp|mp4)$/i.test(file.name)) throw new Error(`${file.name}：请选择JPG、PNG、WebP或MP4。`);
        const asset = await uploadOne(file);
        setAssets(current => [asset, ...current.filter(item => item.id !== asset.id)]);
        setDraft(current => {
          if (!current || [...current.media, ...current.processMedia].some(item => item.assetId === asset.id)) return current;
          return { ...current, media: [...current.media, { assetId: asset.id, alt: file.name.replace(/\.[^.]+$/, ""), caption: "" }] };
        });
        setDirty(true);
      } catch (cause) { failed(cause); break; }
    }
    uploadRequest.current = null; setTransfer(null); if (fileInput.current) fileInput.current.value = "";
    request<{ assets: OwnerAsset[] }>("/assets").then(result => setAssets(result.assets)).catch(failed);
  };
  const updateMedia = (role: "media" | "processMedia", index: number, update: Partial<DraftMedia>) => {
    if (draft) change(role, draft[role].map((item, i) => i === index ? { ...item, ...update } : item));
  };
  const moveMedia = (role: "media" | "processMedia", index: number, step: number) => {
    if (!draft) return; const list = [...draft[role]]; const next = index + step;
    if (next < 0 || next >= list.length) return; [list[index], list[next]] = [list[next], list[index]]; change(role, list);
  };
  const removeMedia = (role: "media" | "processMedia", index: number) => {
    if (!draft) return; const id = draft[role][index].assetId;
    setDraft({ ...draft, [role]: draft[role].filter((_, i) => i !== index), coverAssetId: draft.coverAssetId === id ? null : draft.coverAssetId }); setDirty(true);
  };
  const logOut = (all = false) => action(async () => {
    await request(all ? "/revoke-sessions" : "/session", csrf, all ? "POST" : "DELETE");
    uploadRequest.current?.abort(); setSession({ authenticated: false }); setRecord(null); setDraft(null); setDirty(false); setPreview(null); setAssets([]); setWorks([]);
  });

  if (session === null) return <section className="softPage"><h1 className="display">站主管理</h1><p role="status">正在确认登录状态。</p></section>;
  if (!session.authenticated) return <section className={styles.login}>
    <p className={styles.eyebrow}>OWNER / 站主入口</p><h1 className="display" tabIndex={-1}>欢迎回来</h1>
    <p className="muted">登录后上传作品、保存草稿和管理发布。</p>
    <form onSubmit={event => { event.preventDefault(); action(async () => { const next = await request<OwnerSession>("/session", undefined, "POST", { password }); setPassword(""); setSession(next); }); }}>
      <label htmlFor="owner-password">站主口令</label><input id="owner-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={200} />
      <button className="button" disabled={busy} type="submit">{busy ? "正在登录…" : "登录"}</button>
    </form>{error && <p className={styles.error} role="alert">{error}</p>}<Link href="/works/">返回作品</Link>
  </section>;

  return <section className={styles.page}>
    <header className={styles.top}><div><p className={styles.eyebrow}>OWNER / 作品管理</p><h1 className="display" tabIndex={-1}>创作的下一页</h1></div><div className={styles.actions}><span className={styles.storage} data-ready={storage === true}>{storage === null ? "正在检查存储" : storage ? "作品存储可用" : "作品存储暂不可用"}</span><button className="button secondary" onClick={() => logOut()} disabled={busy}>退出登录</button></div></header>
    <div className={styles.feedback} aria-live="polite">{notice && <p>{notice}</p>}{error && <p className={styles.error} role="alert">{error}</p>}</div>
    {preview ? <div className={styles.preview}><div className={styles.previewBar}><strong>草稿预览 · 仅站主可见</strong><button className="button secondary" onClick={() => setPreview(null)}>继续编辑</button></div><WorkDetail work={preview} relatedWorks={[]} preview /></div> : <div className={styles.layout}>
      <aside className={styles.sidebar}><button className="button" onClick={() => chooseWork(null)} disabled={busy || !!transfer}>新建作品</button><h2>作品库 <small>{works.length}</small></h2><ul>{works.map(work => <li key={work.id}><button aria-pressed={record?.id === work.id} onClick={() => chooseWork(work)} disabled={busy || !!transfer}><strong>{work.draft.title}</strong><span>{work.status === "published" ? "已发布" : "草稿"}{work.publishedRevision !== null && work.publishedRevision !== work.revision ? " · 有新草稿" : ""}</span></button></li>)}</ul><button className="button secondary" onClick={() => action(refresh)} disabled={busy || !!transfer}>刷新作品库</button><button className={styles.textButton} onClick={() => logOut(true)} disabled={busy || !!transfer}>退出所有设备</button></aside>
      <div className={styles.editor}>{draft ? <>
        <div className={styles.editorHead}><h2>{record ? "编辑作品" : "新作品"}</h2><span>{dirty ? "尚未保存" : record ? "草稿已保存" : "尚未创建"}</span></div>
        <fieldset disabled={busy || !!transfer} className={styles.fields}>
          <label>作品标题<input value={draft.title} maxLength={100} onChange={event => change("title", event.target.value)} /></label>
          <label>所属岛屿<select value={draft.themeId} onChange={event => change("themeId", event.target.value as WorkDraft["themeId"])}>{workThemes.map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
          <label>作品地址<input value={draft.slug} disabled={!!record} pattern="[a-z0-9][a-z0-9-]{1,79}" maxLength={80} onChange={event => change("slug", event.target.value)} /><small>英文小写、数字和连字符；创建后固定。</small></label>
          <label>显示顺序<input type="number" min={0} max={9999} value={draft.sortOrder} onChange={event => change("sortOrder", Number(event.target.value))} /></label>
          <label>副标题<input value={draft.subtitle} maxLength={200} onChange={event => change("subtitle", event.target.value)} /></label>
          <label>作品类型<input value={draft.category} maxLength={80} onChange={event => change("category", event.target.value)} placeholder="如：人物视觉 / 静帧分镜" /></label>
          <label className={styles.full}>作品介绍<textarea rows={5} value={draft.description} maxLength={2000} onChange={event => change("description", event.target.value)} /></label>
        </fieldset>
        <section className={styles.upload}><h3>上传素材</h3><p className="muted">JPG / PNG / WebP / MP4，单个文件最多30MiB。视频最多3分钟。文件传完后还需等待处理。</p><input ref={fileInput} aria-label="选择作品素材" type="file" accept=".jpg,.jpeg,.png,.webp,.mp4" multiple disabled={!!transfer || busy || storage === false} onChange={event => uploadFiles(event.target.files)} />{transfer && <div role="status"><p>{transfer.name} · {transfer.percent}%</p><progress max={100} value={transfer.percent} aria-label="文件上传进度" /><button className={styles.textButton} onClick={() => uploadRequest.current?.abort()}>取消当前上传</button></div>}</section>
        <fieldset disabled={busy || !!transfer} className={styles.mediaFieldset}>
        {(["media", "processMedia"] as const).map(role => <section className={styles.sequence} key={role}><h3>{role === "media" ? "作品内容" : "过程与参考"} <small>{draft[role].length}</small></h3>{!draft[role].length && <p className="muted">从下方素材库加入图片或视频。</p>}<ol>{draft[role].map((item, index) => { const asset = assets.find(candidate => candidate.id === item.assetId); return <li className={styles.mediaRow} key={item.assetId}>
          <div className={styles.thumbnail}>{asset?.src && asset.kind !== "video" ? <img src={asset.src} alt={item.alt || "作品素材"} /> : asset?.poster ? <img src={asset.poster} alt="视频封面" /> : <span>{asset ? statusLabel[asset.status] : "正在读取素材"}</span>}</div>
          <div className={styles.mediaFields}><span className={styles.assetName}>{asset?.filename || item.assetId} · {asset ? statusLabel[asset.status] : ""}</span><label>画面说明<input value={item.alt} maxLength={300} onChange={event => updateMedia(role, index, { alt: event.target.value })} /></label><label>图注<input value={item.caption} maxLength={300} onChange={event => updateMedia(role, index, { caption: event.target.value })} /></label>{asset?.error && <p className={styles.error}>{asset.error}</p>}<div className={styles.actions}>{asset?.status === "ready" && asset.kind !== "video" && <button className="button secondary" aria-pressed={draft.coverAssetId === item.assetId} onClick={() => change("coverAssetId", item.assetId)}>{draft.coverAssetId === item.assetId ? "当前封面" : "设为封面"}</button>}<button className={styles.textButton} disabled={index === 0} onClick={() => moveMedia(role, index, -1)}>上移</button><button className={styles.textButton} disabled={index === draft[role].length - 1} onClick={() => moveMedia(role, index, 1)}>下移</button><button className={styles.textButton} onClick={() => removeMedia(role, index)}>从作品移除</button></div></div>
        </li>; })}</ol></section>)}</fieldset>
        <div className={styles.saveBar}><button className="button secondary" disabled={busy || !!transfer} onClick={() => action(async () => { await save(); setNotice("草稿已保存，公开版本保持当前发布内容。"); })}>保存草稿</button><button className="button secondary" disabled={busy || !!transfer} onClick={openPreview}>预览草稿</button><button className="button" disabled={busy || !!transfer || storage === false} onClick={publish}>{record?.publishedRevision !== null && record ? "发布更新" : "发布作品"}</button>{record?.status === "published" && <><a className="button secondary" href={`/works/${record.slug}/`} target="_blank" rel="noopener noreferrer">查看公开页 ↗</a><button className={styles.textButton} disabled={busy} onClick={unpublish}>撤下作品</button></>}</div>
        <section className={styles.library}><h3>素材库</h3><p className="muted">素材保留在私有库中，加入作品并发布后，访客才可读取网页版本。</p><div className={styles.assetGrid}>{assets.slice(0, 100).map(asset => <article key={asset.id}><div className={styles.libraryImage}>{asset.src && asset.kind !== "video" ? <img src={asset.src} alt={asset.filename} loading="lazy" /> : asset.poster ? <img src={asset.poster} alt="视频封面" loading="lazy" /> : <span>{statusLabel[asset.status]}</span>}</div><p title={asset.filename}>{asset.filename}</p><span className={styles.assetStatus}>{statusLabel[asset.status]}</span>{asset.error && <p className={styles.error}>{asset.error}</p>}<div className={styles.actions}><button className={styles.textButton} disabled={busy || !!transfer} onClick={() => addAsset(asset, "media")}>加入正文</button><button className={styles.textButton} disabled={busy || !!transfer} onClick={() => addAsset(asset, "processMedia")}>加入过程</button>{asset.status === "error" && <button className={styles.textButton} disabled={busy || !!transfer} onClick={() => action(async () => { await request(`/assets/${asset.id}/retry`, csrf, "POST"); await refresh(); })}>重试处理</button>}</div></article>)}</div></section>
      </> : <div className={styles.empty}><h2>从一件作品开始</h2><p className="muted">选择左侧作品继续编辑，或新建作品开始上传。</p></div>}</div>
    </div>}
  </section>;
}
