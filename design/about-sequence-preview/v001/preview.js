const canvas = document.querySelector('#character');
const context = canvas.getContext('2d', { alpha: false });
const portrait = document.querySelector('#portrait');
const slider = document.querySelector('#progress');
const label = document.querySelector('#frame-label');
const loading = document.querySelector('#loading');
const play = document.querySelector('#play');
const hint = document.querySelector('#hint');
const track = document.querySelector('.scroll-track');
const modeButtons = [...document.querySelectorAll('[data-mode]')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const frames = [];
let frame = 4;
let mode = 'pointer';
let playing = false;
let previousTime = 0;
let phase = 0;
let totalBytes = 0;
let raf = 0;
let ready = false;
let loadFailed = false;
const publicState = { ready: false, frame: 4, frameCount: 9, mode, playing: false, errors: [], renderCount: 0 };
window.sequencePreview = publicState;

function draw() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.round(portrait.clientWidth * dpr);
  const height = Math.round(portrait.clientHeight * dpr);
  if (width !== canvas.width || height !== canvas.height) { canvas.width = width; canvas.height = height; }
  context.fillStyle = '#e8edf1';
  context.fillRect(0, 0, width, height);
  const image = frames[frame];
  if (!image) return;
  const scale = Math.max(width / image.width, height / image.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, (width - image.width * scale) / 2, (height - image.height * scale) / 2, image.width * scale, image.height * scale);
  publicState.renderCount++;
}
function setFrame(value) {
  const next = Math.max(0, Math.min(8, Math.round(value)));
  if (frame === next && publicState.renderCount) return;
  frame = next;
  publicState.frame = frame;
  label.textContent = String(frame + 1).padStart(2, '0');
  slider.value = String(frame);
  slider.setAttribute('aria-valuetext', `第 ${frame + 1} 帧，共 9 帧`);
  draw();
}
function animate(time) {
  if (!playing || document.hidden) return;
  if (!previousTime) previousTime = time;
  phase += Math.min(time - previousTime, 80) / 2000;
  previousTime = time;
  setFrame((1 - Math.cos(phase * Math.PI)) * 4);
  raf = requestAnimationFrame(animate);
}
function stop() {
  playing = false;
  publicState.playing = false;
  cancelAnimationFrame(raf);
  previousTime = 0;
  play.setAttribute('aria-pressed', 'false');
  play.innerHTML = '<span aria-hidden="true">▷</span> 自动播放';
}
function chooseMode(value) {
  stop();
  mode = value;
  publicState.mode = value;
  for (const button of modeButtons) button.setAttribute('aria-pressed', String(button.dataset.mode === value));
  hint.innerHTML = mode === 'scroll' ? '向下滚动，人物从左转向右。<br>也可使用进度条逐帧查看。' : '将指针移到人物上，左右移动。<br>手机可以左右拖动，也可使用下方进度条。';
  if (mode === 'scroll') scrollFrame();
}
function scrollFrame() {
  if (mode !== 'scroll' || playing || !ready) return;
  const bounds = track.getBoundingClientRect();
  setFrame((-bounds.top / Math.max(1, bounds.height - innerHeight)) * 8);
}
slider.addEventListener('input', () => { stop(); setFrame(Number(slider.value)); });
modeButtons.forEach(button => button.addEventListener('click', () => chooseMode(button.dataset.mode)));
play.addEventListener('click', () => {
  if (!ready || loadFailed) return;
  if (playing) return stop();
  playing = true;
  publicState.playing = true;
  phase = Math.acos(1 - frame / 4) / Math.PI;
  previousTime = 0;
  play.setAttribute('aria-pressed', 'true');
  play.innerHTML = '<span aria-hidden="true">Ⅱ</span> 暂停播放';
  raf = requestAnimationFrame(animate);
});
let dragging = false;
function pointerFrame(event) {
  if (mode !== 'pointer' || playing || !ready || (event.pointerType !== 'mouse' && !dragging)) return;
  const bounds = portrait.getBoundingClientRect();
  setFrame(((event.clientX - bounds.left) / bounds.width) * 8);
}
portrait.addEventListener('pointerdown', event => {
  if (mode !== 'pointer' || !ready) return;
  stop(); dragging = true; portrait.setPointerCapture(event.pointerId); pointerFrame(event);
});
portrait.addEventListener('pointermove', pointerFrame);
portrait.addEventListener('pointerup', () => { dragging = false; });
portrait.addEventListener('pointercancel', () => { dragging = false; });
addEventListener('scroll', scrollFrame, { passive: true });
new ResizeObserver(draw).observe(portrait);
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
reduced.addEventListener('change', () => { if (reduced.matches) stop(); });
window.addEventListener('error', event => publicState.errors.push(event.message));
window.addEventListener('unhandledrejection', event => publicState.errors.push(String(event.reason)));
play.disabled = true;
slider.disabled = true;
modeButtons.forEach(button => { button.disabled = true; });
try {
  const manifest = await fetch('./manifest.json').then(response => { if (!response.ok) throw new Error('帧清单不可用'); return response.json(); });
  totalBytes = manifest.totalBytes;
  // Decode the centre frame first, then preload the bounded nine-frame sequence.
  const order = [4, 3, 5, 2, 6, 1, 7, 0, 8];
  for (const index of order) {
    const image = new Image();
    image.src = manifest.frames[index].url;
    await image.decode();
    frames[index] = image;
    if (index === 4) draw();
    loading.textContent = `已加载 ${frames.filter(Boolean).length} / 9`;
  }
  ready = true;
  publicState.ready = true;
  publicState.totalBytes = totalBytes;
  publicState.frameHashes = manifest.frames.map(item => item.sha256);
  loading.textContent = `9 帧 · ${(totalBytes / 1048576).toFixed(2)} MB`;
  play.disabled = false;
  slider.disabled = false;
  modeButtons.forEach(button => { button.disabled = false; });
  setFrame(4);
} catch (error) {
  loadFailed = true;
  publicState.errors.push(String(error));
  loading.textContent = '人物帧加载失败，请刷新重试';
}
