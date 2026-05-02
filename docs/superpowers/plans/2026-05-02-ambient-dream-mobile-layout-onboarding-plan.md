# Ambient Dream 手机端两排布局 + 首次引导动效 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 仅在手机端（<=820px）实现底部两排收纳布局，音乐坞展开时自动隐藏底部按钮与中部提示，并加入一次性的“逐步亮相→收纳”的可点击引导动效；电脑端现有样式不改动。

**Architecture:** 在 `ambient-dream-v2.html` 内复用已有 `viewportProfile` 机制生成 `viewport-mobile*` class；以 CSS（`@media (max-width: 820px)` + 新增 class）实现两排与隐藏规则；用 React state + timer 驱动 onboarding 阶段，并用一次性 storage key 控制是否播放。

**Tech Stack:** 单页 HTML（React + Babel in-browser），CSS（media query + CSS var），localStorage（safeReadStorage/safeWriteStorage），Node 内置测试（`node --test`）。

---

## File Structure

- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)
  - 增加 mobile 判定与 class 输出（`viewport-mobile`, `viewport-mobile-portrait`）
  - 手机端 `.controls` 仅保留 `♥/目录/播放`，并在音乐坞展开时隐藏
  - 手机端 `.music-dock` 折叠态改为紧凑宽度（避免挤占中部）
  - 手机端 `.bottom-center-stack` 在音乐坞展开时隐藏
  - 新增 onboarding：阶段 state、一次性存储 key、可点击中止、三段点亮动效
- Modify (optional): [tests/index-redirect.test.js](file:///workspace/tests/index-redirect.test.js)
  - 更新/补充字符串断言，避免新 key 引入后测试失真

---

### Task 1: 明确手机端判定与 class 输出

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 写一个最小的断言（可选）**

在 `tests/index-redirect.test.js` 中补充一个简单字符串断言，保证 `viewport-mobile`（或 onboarding key）被写入到 HTML 中，避免未来回归。

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('ambient-dream-v2.html contains mobile onboarding key', () => {
  const html = readFileSync(join(process.cwd(), 'ambient-dream-v2.html'), 'utf8');
  assert.ok(html.includes('ambient-dream-mobile-onboarding-v1'));
});
```

- [ ] **Step 2: 运行测试确认新增断言先失败（可选）**

Run:

```bash
node --test
```

Expected: 若 key 尚未写入，FAIL（仅在你确实加了此断言时）。

- [ ] **Step 3: 在 React 里计算 `isMobile/isPortrait` 并输出 class**

实现要点：

- 使用 `viewportProfile.width/height`（已有 state）计算：
  - `const isMobile = viewportProfile.width <= 820`
  - `const isMobilePortrait = isMobile && viewportProfile.height > viewportProfile.width`
- 在 `.main-stage` 的 className 里增加：
  - `isMobile ? 'viewport-mobile' : ''`
  - `isMobilePortrait ? 'viewport-mobile-portrait' : ''`
- 保持桌面端 class 不变（仅额外 class，不改已有 class 的拼接逻辑与默认值）

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --test
```

Expected: PASS。

---

### Task 2: 手机端两排布局（CSS）与折叠态音乐坞紧凑化

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 在 `@media (max-width: 820px)` 内新增/调整 CSS（仅影响手机端）**

目标：

- `.controls` 固定在底部作为第 1 排
- `.music-dock`（collapsed）改为“紧凑宽度，靠左”，作为第 2 排的一部分
- `.bottom-center-stack` 保持居中

建议实现方式：

- 给 `.main-stage.viewport-mobile` 写 CSS 变量 `--mobile-controls-h`（默认值比如 `72px`）
- `.controls` 在手机端保持 `bottom: 18px`（当前已有），并保证其高度可预测
- `.music-dock` 在手机端使用：
  - `bottom: calc(var(--mobile-controls-h) + 14px)`
  - `left: 16px; right: auto; width: fit-content; max-width: 62vw;`
  - collapsed 不要 `width: calc(100vw - 32px)`（这是堆叠的主要来源）
- `.bottom-center-stack`（居中那组）也用 `bottom: calc(var(--mobile-controls-h) + 14px)`（或仅在需要时加一个 `translateY`）

- [ ] **Step 2: 运行页面做一次手机端截图对比（人工验收）**

验证点：

- 收起态不遮挡：音乐坞（左）与中部“再遇见一条/提示”同一高度，但互不覆盖
- 右下按钮组变为紧凑常驻（见 Task 3）

---

### Task 3: 手机端 controls 渲染改为 3 按钮（♥ / 目录 / 播放）

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 改 JSX：手机端分支渲染**

逻辑：

- 桌面端保持现有 controls 不变
- 手机端渲染三个按钮：
  - `♥`：复用 `addFavorite`
  - `目录`：复用打开目录逻辑
  - `播放/暂停`：复用 `togglePlayback`，文案/图标随 `isPlaying` 变化

- [ ] **Step 2: 改 CSS：手机端 3 按钮等宽/网格**

建议：

- 手机端 `.controls` 改为 `grid-template-columns: repeat(3, minmax(0, 1fr))`
- `.soft-icon-btn` 在手机端适配为 `height: 48px; width: 100%`（已有类似规则，可复用）

- [ ] **Step 3: 运行测试**

Run:

```bash
node --test
```

Expected: PASS。

---

### Task 4: 音乐坞展开时手机端隐藏（controls + bottom-center-stack）

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 增加一个状态 class**

当 `isMobile && (musicDockOpen || musicDockPinned)` 时：

- 给 `.main-stage` 或相关容器加 `mobile-dock-expanded`

- [ ] **Step 2: CSS 仅在手机端生效的隐藏规则**

在 `@media (max-width: 820px)` 或 `.viewport-mobile` 下：

- `.mobile-dock-expanded .controls { opacity: 0; pointer-events: none; }`
- `.mobile-dock-expanded .bottom-center-stack { opacity: 0; pointer-events: none; }`

避免直接 `display: none` 造成点击时序问题（保证“点到播放就开始”更稳定）。

- [ ] **Step 3: 人工验收**

验证点：

- 音乐坞展开：只剩音乐坞内容，不再堆叠遮挡
- 音乐坞收起：controls 与 bottom-center-stack 恢复

---

### Task 5: 一次性 onboarding（可点击、交互即终止）

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 增加 storage key 与 state**

新增：

- `STORAGE_KEYS.mobileOnboarding = 'ambient-dream-mobile-onboarding-v1'`
- `const [mobileOnboarding, setMobileOnboarding] = useState(...)`（仅手机端且未标记才 true）

- [ ] **Step 2: 引导阶段机（3 段）与 CSS 高亮类**

阶段建议：`'music' -> 'scroll' -> 'controls' -> 'done'`

- 音乐：给 `.music-dock` 加高亮 class（轻微 scale + glow）
- 翻句：给 `.bottom-center-stack` 加高亮 class
- 功能区：给 `.controls` 加高亮 class（短暂更明显，然后回到紧凑态）

- [ ] **Step 3: 中止机制（允许点击）**

在引导期间监听（passive）：

- `pointerdown`, `wheel`, `touchmove`, `keydown`

行为：

- 不 `preventDefault`
- 用 `setTimeout(() => stopOnboarding(), 0)` 在事件后结束引导（避免吞掉点击）
- `stopOnboarding` 写入 storage key，并清理 timers/listeners

- [ ] **Step 4: reduced-motion 处理**

若 `reducedMotion` 为 true：

- 不开启引导（或立即 `stopOnboarding`）

- [ ] **Step 5: 测试与人工验收**

Run:

```bash
node --test
```

人工验收：

- 首次手机端进入会播放引导
- 动画过程中点击播放：立即开始播放（若浏览器允许）且引导立刻结束
- 任何交互都会中止引导并落到最终布局

---

## Self-Review

- 覆盖 spec：两排收纳、展开隐藏、一次性引导、可点击中止、桌面不变、B 方案三按钮常驻
- 无占位符：所有任务都有具体文件、具体逻辑与验证步骤
- 命名一致：`viewport-mobile` / `viewport-mobile-portrait` / `mobile-dock-expanded` / `ambient-dream-mobile-onboarding-v1`

