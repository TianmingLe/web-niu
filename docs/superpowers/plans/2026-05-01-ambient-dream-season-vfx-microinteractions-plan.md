# Ambient Dream Season VFX + Microinteractions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html) 中实现四季沉浸背景（视差+粒子+交互+降级）与微交互（自读呼吸进度、果冻触感、再次相遇入口、旁白式提示意象→真实提示）。

**Architecture:** 在单文件 React 应用中新增 `SeasonVfx` 引擎（CSS 多层背景 + Canvas 粒子层 + 交互涟漪），用 `droppedNotes.length`（当前便签数）计算季节并 300ms debounce 切换，以 1–2s 交叉渐变过渡。微交互通过可复用的 `WhisperText`（意象→真实提示）与按压反馈 CSS 类实现，尊重 `prefers-reduced-motion` 并提供 FPS 低于阈值的自动降级。

**Tech Stack:** React 18 UMD + Babel in-browser、GSAP（已有）、Canvas 2D（新增，原生）、CSS transforms/opacities（新增）。

---

## 文件结构与改动面

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)
- Create: [docs/superpowers/specs/2026-05-01-ambient-dream-season-vfx-microinteractions-design.md](file:///workspace/docs/superpowers/specs/2026-05-01-ambient-dream-season-vfx-microinteractions-design.md)（已完成）

---

### Task 1: 增加季节计算与切换状态（debounce + 交叉渐变状态）

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 在 `<script type="text/babel">` 的工具函数区域新增季节常量与计算函数**

添加（放在 `THEMES/FONT_PRESETS` 等常量附近）：

```js
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

const getSeasonByNoteCount = (count) => {
  if (!Number.isFinite(count) || count <= 5) return null;
  const idx = Math.floor((count - 6) / 8) % 4;
  return SEASONS[(idx + 4) % 4];
};
```

- [ ] **Step 2: 在 App 状态区新增季节状态**

在 `const [droppedNotes, setDroppedNotes] = ...` 附近新增：

```js
const [activeSeason, setActiveSeason] = React.useState(null);
const [transitionSeason, setTransitionSeason] = React.useState(null);
const [isSeasonTransitioning, setIsSeasonTransitioning] = React.useState(false);
```

- [ ] **Step 3: 用 300ms debounce 从“当前便签数”驱动季节切换**

在 effects 区新增（依赖 `droppedNotes.length`）：

```js
React.useEffect(() => {
  const next = getSeasonByNoteCount(droppedNotes.length);
  const t = window.setTimeout(() => {
    if (next === activeSeason) return;
    setTransitionSeason(next);
    setIsSeasonTransitioning(true);
  }, 300);
  return () => window.clearTimeout(t);
}, [droppedNotes.length, activeSeason]);
```

- [ ] **Step 4: 在进入过渡后，延迟提交 activeSeason（1–2s）**

新增 effect：

```js
React.useEffect(() => {
  if (!isSeasonTransitioning) return;
  const t = window.setTimeout(() => {
    setActiveSeason(transitionSeason);
    setIsSeasonTransitioning(false);
  }, 1400);
  return () => window.clearTimeout(t);
}, [isSeasonTransitioning, transitionSeason]);
```

- [ ] **Step 5: 验证（手动）**
- 打开页面（本地预览）：`http://127.0.0.1:8000/ambient-dream-v2.html`
- 新建便签到 6 张：应从“默认背景”过渡到“春”
- 删除便签到 5 张：应回到“默认背景”（同样平滑过渡）
- 在 13↔14 附近快速增删：只有稳定 300ms 才会换季，不应抖动闪烁

---

### Task 2: 实现四季背景的 DOM 层（远/中/近景）与 1–2s 交叉渐变

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 新增背景容器样式（只用 transform/opacity）**

在 CSS 中新增（放在 `.main-stage` 相关样式附近）：

```css
.season-stage {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.season-layer {
  position: absolute;
  inset: -6%;
  will-change: transform, opacity, filter;
  transform: translate3d(0, 0, 0);
  opacity: 0;
  transition: opacity 1.4s ease, filter 1.4s ease;
}

.season-layer.is-active {
  opacity: 1;
}
```

- [ ] **Step 2: 为四季各提供一套渐变基底（远景/中景）**

新增（示例：远景作为主色雾层，中景作为模糊形体层；使用渐变与轻微噪声替代图片）：

```css
.season-far.spring { background: radial-gradient(1100px 700px at 20% 18%, rgba(168,149,184,0.20), transparent 60%), radial-gradient(900px 520px at 80% 35%, rgba(152,174,187,0.18), transparent 62%), linear-gradient(180deg, rgba(16,17,24,1), rgba(16,17,24,1)); }
.season-far.summer { background: radial-gradient(900px 620px at 22% 22%, rgba(96,108,160,0.22), transparent 62%), radial-gradient(1100px 700px at 78% 36%, rgba(132,94,166,0.20), transparent 64%), linear-gradient(180deg, rgba(16,17,24,1), rgba(16,17,24,1)); }
.season-far.autumn { background: radial-gradient(900px 620px at 24% 24%, rgba(208,195,168,0.20), transparent 62%), radial-gradient(1100px 700px at 78% 44%, rgba(200,167,167,0.18), transparent 64%), linear-gradient(180deg, rgba(16,17,24,1), rgba(16,17,24,1)); }
.season-far.winter { background: radial-gradient(900px 620px at 22% 22%, rgba(152,174,187,0.22), transparent 62%), radial-gradient(1100px 700px at 78% 44%, rgba(127,128,154,0.16), transparent 64%), linear-gradient(180deg, rgba(16,17,24,1), rgba(16,17,24,1)); }

.season-mid.spring { background: radial-gradient(520px 280px at 18% 20%, rgba(250,244,238,0.06), transparent 62%), radial-gradient(600px 340px at 84% 30%, rgba(168,149,184,0.08), transparent 66%); filter: blur(10px); }
.season-mid.summer { background: radial-gradient(540px 300px at 18% 26%, rgba(250,244,238,0.05), transparent 64%), radial-gradient(600px 360px at 84% 34%, rgba(132,94,166,0.08), transparent 66%); filter: blur(11px); }
.season-mid.autumn { background: radial-gradient(540px 300px at 18% 26%, rgba(250,244,238,0.05), transparent 64%), radial-gradient(600px 360px at 84% 34%, rgba(208,195,168,0.08), transparent 66%); filter: blur(11px); }
.season-mid.winter { background: radial-gradient(540px 300px at 18% 24%, rgba(250,244,238,0.05), transparent 64%), radial-gradient(600px 360px at 84% 34%, rgba(152,174,187,0.08), transparent 66%); filter: blur(12px); }
```

- [ ] **Step 3: 在 React 渲染中注入背景层（z-index 在主体内容之下）**

在 `.main-stage` 根节点内部，正文/便签层之前插入：

```jsx
<div className="season-stage" aria-hidden="true">
  <div className={`season-layer season-layer-far season-far ${activeSeason || 'base'} ${activeSeason ? 'is-active' : ''}`} />
  <div className={`season-layer season-layer-mid season-mid ${activeSeason || 'base'} ${activeSeason ? 'is-active' : ''}`} />
  <canvas className="season-canvas" />
  <div className={`season-layer season-layer-far season-far ${transitionSeason || 'base'} ${isSeasonTransitioning ? 'is-active' : ''}`} />
  <div className={`season-layer season-layer-mid season-mid ${transitionSeason || 'base'} ${isSeasonTransitioning ? 'is-active' : ''}`} />
  <canvas className="season-canvas season-canvas-next" />
</div>
```

并确保原有内容容器设置更高层级（例如 `position: relative; z-index: 1;`）。

- [ ] **Step 4: prefers-reduced-motion 处理**

CSS 增加：

```css
@media (prefers-reduced-motion: reduce) {
  .season-layer { transition: none; }
}
```

- [ ] **Step 5: 验证（手动）**
- 0–5 张便签：背景不变
- 第 6 张：1–2s 渐变到春色
- 之后每跨越 +8：均为交叉渐变，无硬切

---

### Task 3: 实现 Canvas 粒子系统（四季）+ FPS 降级 + reduced-motion 冻结

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 新增 reduced-motion 与 FPS 监测工具**

在 App 内新增：

```js
const useReducedMotion = () => {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(!!mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
};
```

并在 App 中使用：

```js
const reducedMotion = useReducedMotion();
const [vfxLevel, setVfxLevel] = React.useState('full');
```

- [ ] **Step 2: 新增粒子引擎（只用 requestAnimationFrame）**

新增函数（放在 App 内或工具函数区；建议工具函数区）：

```js
const createRng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
```

粒子结构（示例）：

```js
const spawnSeasonParticle = (season, rng, w, h) => {
  const x = rng() * w;
  const y = -20 - rng() * 40;
  const base = {
    x, y,
    vx: (rng() - 0.5) * 0.18,
    vy: 0.20 + rng() * 0.55,
    rot: (rng() - 0.5) * 1.2,
    vr: (rng() - 0.5) * 0.006,
    life: 1,
    size: 6 + rng() * 10,
    alpha: 0.12 + rng() * 0.28
  };
  if (season === 'summer') return { ...base, vy: 0.06 + rng() * 0.20, alpha: 0.10 + rng() * 0.24, size: 2 + rng() * 4, tw: rng() };
  if (season === 'winter') return { ...base, vy: 0.16 + rng() * 0.46, alpha: 0.10 + rng() * 0.22, size: 1.5 + rng() * 3 };
  if (season === 'autumn') return { ...base, vy: 0.22 + rng() * 0.70, alpha: 0.12 + rng() * 0.26, size: 7 + rng() * 12 };
  return base;
};
```

- [ ] **Step 3: 绘制逻辑（按季节画不同“材质”）**

绘制函数（示例）：

```js
const drawParticle = (ctx, season, p) => {
  ctx.globalAlpha = p.alpha;
  if (season === 'summer') {
    ctx.fillStyle = 'rgba(250,244,238,0.9)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (season === 'winter') {
    ctx.strokeStyle = 'rgba(250,244,238,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - p.size, p.y);
    ctx.lineTo(p.x + p.size, p.y);
    ctx.stroke();
    return;
  }
  if (season === 'autumn') {
    ctx.fillStyle = 'rgba(208,195,168,0.9)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.size * 0.6, p.size * 0.35, p.rot, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = 'rgba(168,149,184,0.85)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, p.size * 0.6, p.size * 0.35, p.rot, 0, Math.PI * 2);
  ctx.fill();
};
```

- [ ] **Step 4: 将粒子绑定到两张 canvas（active / transition）**

实现 `useEffect`：
- 通过 `querySelector('.season-canvas')` 获取 canvas，设置 DPR 缩放
- 每帧更新粒子位置，超出屏幕回收并补充
- 对 `activeSeason === null`（0–5 张）时完全禁用粒子
- 当 `isSeasonTransitioning` 时同时跑两套粒子，按不透明度交叉（与背景层一致）

要求：
- 只修改 canvas 像素，不修改任何布局属性
- 鼠标视差偏移通过 `translate3d` 施加在 `.season-layer`，canvas 不做 DOM 位移（减少抖动）

- [ ] **Step 5: FPS 降级策略**

实现简单 FPS 估计：
- 以 60 帧为窗口求平均帧耗时
- 当平均 FPS < 30，`setVfxLevel('low')`（粒子数减半，禁用涟漪）
- 当 FPS 恢复 > 45 持续一段时间，可回升到 `full`（可选；若不回升也可接受）

- [ ] **Step 6: reduced-motion 行为**

当 `reducedMotion === true`：
- 不启动 rAF 循环（粒子、视差、涟漪全部冻结）
- 仍保留季节色块渐变（或直接无过渡）

- [ ] **Step 7: 验证（手动）**
- 开启系统“减少动态效果”：背景应静止，但季节色仍可区分
- 关闭“减少动态效果”：粒子随季节变化（春花瓣、夏流萤、秋落叶、冬飞雪的差异可感知）
- 在低配设备（或手动临时把粒子数调大）触发 FPS<30：应自动降级

---

### Task 4: 视差与“空白处点击涟漪”交互（不干扰便签/面板）

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 复用已有“空白点击”过滤规则**

在现有逻辑里已出现：

```js
if (e.target?.closest?.('.memory-note, .controls, .music-dock, .favorites-panel, .modal-overlay')) return;
```

把季节涟漪的触发挂在同样的过滤条件上，确保不影响拖拽便签、控制区按钮与模态框。

- [ ] **Step 2: 视差（鼠标移动驱动三层偏移）**

实现一个 rAF 合帧的 pointer move：
- 读取鼠标在视口的归一化位置 `nx, ny ∈ [-1, 1]`
- 设置 CSS 变量 `--parallax-x/--parallax-y`
- CSS 中对 `.season-layer-far/.mid` 应用不同倍率的 `translate3d`

示例 CSS：

```css
.season-stage { --px: 0; --py: 0; }
.season-layer-far { transform: translate3d(calc(var(--px) * 6px), calc(var(--py) * 6px), 0); }
.season-layer-mid { transform: translate3d(calc(var(--px) * 12px), calc(var(--py) * 12px), 0); }
```

- [ ] **Step 3: 涟漪实现（Canvas 叠加或单独 ripple 列表）**

推荐复用 canvas：点击时向当前季节 canvas 注入一个 ripple 对象，绘制 1.2–1.8s 后消隐。

涟漪差异（按季节）：
- 春：淡紫/粉的花瓣扩散（用多个小椭圆沿圆环散开）
- 夏：光点弹跳（几次轻微的半径脉冲）
- 秋：落叶旋涡（旋转衰减的椭圆轨迹）
- 冬：冰霜蔓延（淡色圆环扩散 + 轻微齿状边缘暗示）

- [ ] **Step 4: 验证（手动）**
- 点击空白处：出现季节对应涟漪
- 点击便签/按钮/面板：不触发涟漪
- 拖拽便签：不被涟漪/视差事件抢占

---

### Task 5: 自读“呼吸式进度”（细线 + 游走点）与操作时淡出

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: CSS 动画（呼吸 + 点游走）**

新增：

```css
.breath-progress {
  position: absolute;
  left: 50%;
  bottom: 92px;
  transform: translateX(-50%);
  z-index: 65;
  width: 160px;
  height: 18px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.breath-progress.visible {
  opacity: 0.9;
  transform: translateX(-50%) translateY(0);
}

.breath-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  transform: translateY(-50%);
  background: rgba(244,240,235,0.18);
  overflow: hidden;
}

.breath-line::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(244,240,235,0.55), transparent);
  opacity: 0.55;
  animation: breathGlow 3.2s ease-in-out infinite;
}

.breath-dot {
  position: absolute;
  top: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(244,240,235,0.72);
  transform: translateY(-50%);
  box-shadow: 0 0 0 6px rgba(244,240,235,0.06);
  animation: dotDrift 3.2s ease-in-out infinite;
}

@keyframes breathGlow {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.72; }
}

@keyframes dotDrift {
  0%, 100% { left: 10px; opacity: 0.45; }
  50% { left: calc(100% - 16px); opacity: 0.9; }
}

@media (prefers-reduced-motion: reduce) {
  .breath-line::after, .breath-dot { animation: none; }
  .breath-progress { transition: none; }
}
```

- [ ] **Step 2: React 状态与“操作时淡出”**

新增状态：

```js
const [isUserInteracting, setIsUserInteracting] = React.useState(false);
```

绑定事件（wheel/pointerdown/touchstart 触发 interacting=true，1.2s 后自动恢复 false）：

```js
React.useEffect(() => {
  let t = null;
  const mark = () => {
    setIsUserInteracting(true);
    window.clearTimeout(t);
    t = window.setTimeout(() => setIsUserInteracting(false), 1200);
  };
  window.addEventListener('wheel', mark, { passive: true });
  window.addEventListener('pointerdown', mark, { passive: true });
  window.addEventListener('touchstart', mark, { passive: true });
  return () => {
    window.removeEventListener('wheel', mark);
    window.removeEventListener('pointerdown', mark);
    window.removeEventListener('touchstart', mark);
    window.clearTimeout(t);
  };
}, []);
```

- [ ] **Step 3: 在渲染树中加入 breath 组件（仅自读开启且非交互时显示）**

在主内容区域（提示文本附近）加入：

```jsx
<div className={`breath-progress ${(isAutoReading && !isUserInteracting) ? 'visible' : ''}`} aria-hidden="true">
  <div className="breath-line" />
  <div className="breath-dot" />
</div>
```

- [ ] **Step 4: 验证（手动）**
- 开启自读：呼吸进度出现
- 滚轮/点按/拖拽：呼吸进度淡出，静置约 1.2s 后恢复

---

### Task 6: 果冻触感（分层）与一致的按压反馈

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 增加两类按压反馈 CSS**

新增：

```css
.press-jelly { transition: transform 0.20s ease, opacity 0.20s ease, background 0.20s ease, box-shadow 0.20s ease; }
.press-soft { transition: transform 0.18s ease, opacity 0.18s ease, background 0.18s ease, box-shadow 0.18s ease; }

.press-jelly:active {
  transform: translateY(1px) scale(0.98);
  opacity: 0.92;
}

.press-soft:active {
  transform: translateY(1px);
  opacity: 0.94;
}

@media (prefers-reduced-motion: reduce) {
  .press-jelly, .press-soft { transition: none; }
}
```

- [ ] **Step 2: 将关键按钮加入 `press-jelly`**

逐个修改 className（示例）：
- `.profile-toggle-btn`（沉浸+/经典）
- `.panel-icon-btn` 的播放按钮（如果你希望它更像“大按钮”，可升为 press-jelly）
- 右下 `.soft-icon-btn`（♥/目录/自读）

示例修改：

```jsx
<button type="button" className="profile-toggle-btn press-jelly" ...>
```

- [ ] **Step 3: 将小按钮加入 `press-soft`**

逐个修改 className（示例）：
- 📌 按钮（收藏夹置顶、音乐坞置顶）
- `.music-mini-btn`（上一首/下一首/顺序/小操作）

示例修改：

```jsx
<button type="button" className={`panel-icon-btn press-soft ${favoritesPinned ? 'active' : ''}`} ...>
```

- [ ] **Step 4: 验证（手动）**
- 大按钮按下：有轻微缩放 + 下沉（果冻触感）
- 小按钮按下：只有下沉，无缩放
- reduced-motion：无过渡动画，但仍有按下态

---

### Task 7: “再次相遇”入口（正文下方）与随机收藏跳转

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 新增按钮样式（轻、旁白式）**

新增：

```css
.reunion-btn {
  position: absolute;
  left: 50%;
  bottom: 64px;
  transform: translateX(-50%);
  z-index: 65;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: rgba(244,240,235,0.70);
  border-radius: 999px;
  padding: 8px 14px;
  font-family: inherit;
  font-size: 12px;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.reunion-btn:hover {
  background: rgba(255,255,255,0.07);
  color: rgba(244,240,235,0.86);
}

.reunion-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
```

- [ ] **Step 2: 新增 handler：随机跳转到收藏**

在 `jumpToFavorite` 附近新增：

```js
const jumpToRandomFavorite = () => {
  if (!favorites.length) return;
  const i = Math.floor(Math.random() * favorites.length);
  jumpToFavorite(favorites[i]);
};
```

- [ ] **Step 3: 在正文下方渲染入口**

放在 `.hint` 附近渲染：

```jsx
<button
  type="button"
  className="reunion-btn press-jelly"
  onClick={jumpToRandomFavorite}
  disabled={!favorites.length}
  title={favorites.length ? '随机翻一条收藏' : '先收藏几句，再来相遇'}
>
  再遇见一条
</button>
```

- [ ] **Step 4: 验证（手动）**
- 有收藏：点击“再遇见一条”会切换到某条收藏
- 无收藏：按钮置灰，hover/title 提示正确

---

### Task 8: 旁白式提示（意象 → 真实提示）组件化并接入收藏空态与主提示

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 实现 `WhisperText` 组件**

在 React 组件区新增：

```jsx
function WhisperText({ imagery, literal, forceLiteral, initialMs = 1800, fadeMs = 1400, className }) {
  const [showLiteral, setShowLiteral] = React.useState(false);
  React.useEffect(() => {
    if (forceLiteral) { setShowLiteral(true); return; }
    setShowLiteral(false);
    const t = window.setTimeout(() => setShowLiteral(true), initialMs);
    return () => window.clearTimeout(t);
  }, [imagery, literal, forceLiteral, initialMs]);
  return (
    <span className={`whisper ${className || ''}`}>
      <span className={`whisper-a ${showLiteral ? 'out' : 'in'}`}>{imagery}</span>
      <span className={`whisper-b ${showLiteral ? 'in' : 'out'}`}>{literal}</span>
    </span>
  );
}
```

- [ ] **Step 2: 增加样式（交叉渐变）**

新增 CSS：

```css
.whisper { position: relative; display: inline-block; }
.whisper-a, .whisper-b {
  display: inline-block;
  transition: opacity 1.4s ease, transform 1.4s ease, filter 1.4s ease;
  will-change: opacity, transform, filter;
}
.whisper-a.out { opacity: 0; transform: translateY(-2px); filter: blur(1px); }
.whisper-a.in { opacity: 1; transform: translateY(0); filter: blur(0); }
.whisper-b.out { opacity: 0; transform: translateY(2px); filter: blur(1px); position: absolute; left: 0; top: 0; }
.whisper-b.in { opacity: 1; transform: translateY(0); filter: blur(0); position: absolute; left: 0; top: 0; }

@media (prefers-reduced-motion: reduce) {
  .whisper-a, .whisper-b { transition: none; filter: none; }
}
```

- [ ] **Step 3: 接入“收藏空态”提示**

替换 favorites 空态文本：

```jsx
<div className="favorite-empty">
  <WhisperText
    imagery="喜欢的句子，会在这里慢慢聚拢。"
    literal="把你喜欢的句子收藏在这里。"
    forceLiteral={favoritesOpen || favoritesPinned}
  />
</div>
```

- [ ] **Step 4: 接入主提示（原 `.hint`）**

将：

```jsx
<div className="hint">滚动鼠标或上滑屏幕，潜入意识深处</div>
```

替换为：

```jsx
<div className="hint">
  <WhisperText
    imagery="风在读，你只需要慢一点。"
    literal="滚动鼠标或上滑屏幕，潜入意识深处"
    forceLiteral={isUserInteracting}
  />
</div>
```

- [ ] **Step 5: 验证（手动）**
- 静置：先出现意象文案，随后缓慢切为真实提示
- 开始操作/面板展开：直接显示真实提示

---

## 全量回归检查清单（手动）

- 四季切换：0–5 不变；6 春；之后每 +8 轮换；删回退正常；debounce 生效
- 过渡：任何换季都为 1–2s 平滑交叉渐变
- 粒子：四季有明显差异；点击空白有涟漪；拖拽便签不受影响
- 无障碍：reduced-motion 冻结动态；focus-visible 样式不被新动效遮蔽
- 触感：大按钮轻果冻；小按钮只软不弹；移动端也有按压反馈
- 再次相遇：有收藏可随机跳转；无收藏不打断
- 旁白提示：意象→真实；操作时真实优先

## 本地验证命令（可选）

```bash
python -m http.server 8000 --bind 0.0.0.0 --directory /workspace
```

