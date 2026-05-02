# Ambient Dream 手机端顶栏缩略 + 右下角更多菜单 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 手机端右上角收起态改为 “FAV + 图钉” 避免截断；底部三圆按钮改为 `♥ / 目录 / ⋯`，其中 `⋯` 可展开更多面板，整合电脑端非音乐功能（自读/整理/沉浸+等），同时与“音乐坞展开隐藏”规则兼容。

**Architecture:** 不改桌面端。手机端通过 CSS 仅在 `viewport-mobile` 下实现 favorites 收起态缩略；React 增加 `mobileMoreOpen` 状态渲染一个轻量 overlay 面板（pointer-events 仅覆盖面板），展开/点击空白关闭。面板按钮直接复用现有 handler（`setIsAutoReading`、`handleArrangeToggle`、`setUiProfile`、`undo`、`clearAllNotes` 等），并在执行后自动收起。

**Tech Stack:** 单页 HTML（React + Babel in-browser），CSS（media query），Node 内置测试（`node --test`）。

---

## File Structure

- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)
- Modify: [tests/index-redirect.test.js](file:///workspace/tests/index-redirect.test.js)（仅在需要新增字符串断言时）

---

### Task 1: 右上角 favorites 收起态显示为 “FAV + 图钉”

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: CSS（仅手机端）确保收起态不截断**

在 `@media (max-width: 820px)` + `.main-stage.viewport-mobile` 下：

- 将收起态标题从 `FAVORITES` 变为 `FAV`（通过 CSS 隐藏原文本并用 `::before` 输出，或通过 React 根据 `isMobile` 渲染不同文本）。
- 若使用 CSS 方案：只在收起态生效，展开态保持原样。

- [ ] **Step 2: 人工验收**

验证点：

- 收起态右上角稳定显示 “FAV” 且不出现 “F…” 截断
- 展开态仍显示完整 favorites 内容

---

### Task 2: 底部三按钮改为 `♥ / 目录 / ⋯`

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 修改手机端 controls 的 JSX**

将手机端第三个按钮从播放改为 `⋯`，并增加状态：

```js
const [mobileMoreOpen, setMobileMoreOpen] = React.useState(false);
```

`⋯` 点击：

- 若音乐坞已展开（mobileDockExpanded）：不打开 more（因为 controls 会隐藏）
- 否则 `setMobileMoreOpen(prev => !prev)`

- [ ] **Step 2: 保留播放能力**

播放按钮从底部三按钮移除后，播放仍可通过：

- 音乐坞折叠态的小播放按钮

不新增其它播放入口（避免“功能重复与堆叠”）。

---

### Task 3: 实现 “⋯ 更多面板” 并整合非音乐功能

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 面板结构**

渲染条件：`isMobile && mobileMoreOpen && !mobileDockExpanded`

DOM 建议：

- `<div className="mobile-more-overlay" onClick={() => setMobileMoreOpen(false)}>`
  - `<div className="mobile-more-panel" onClick={(e) => e.stopPropagation()}> ...buttons... </div>`

按钮集合（非音乐）：

- 自读：`setIsAutoReading(prev => !prev)`
- 整理：`handleArrangeToggle()`
- 沉浸+：`setUiProfile(prev => prev === 'classic' ? 'refined' : 'classic')`

条件按钮（避免杂乱）：

- 撤销：`mode === 'editing'` 时显示，点击 `undo()`
- 标签：`mode === 'editing' && focusedNoteId != null` 时显示，点击 `setIsTagEditorOpen(true)`
- 清空：`mode === 'editing'` 时显示，点击 `clearAllNotes()`
- 新增：`mode === 'editing'` 时显示，点击打开 modal（复用现有 add 行为）

每次点击执行后：`setMobileMoreOpen(false)`。

- [ ] **Step 2: 面板样式（仅手机端）**

目标：不挡正文太多、操作稳定。

建议：

- overlay：`position:absolute; inset:0; pointer-events:auto; background: transparent;`
- panel：`position:absolute; right:16px; bottom: calc(var(--mobile-controls-h) + 22px);`
- panel 内按钮：两列 grid，圆角卡片风格，点击高亮。

- [ ] **Step 3: 与音乐坞展开隐藏规则兼容**

当 `mobileDockExpanded` 变为 true 时：

- `setMobileMoreOpen(false)`（用 effect 监听）

---

### Task 4: 测试与回归

**Files:**
- Modify: [tests/index-redirect.test.js](file:///workspace/tests/index-redirect.test.js)（可选）

- [ ] **Step 1: 如需补测试，增加字符串断言**

```js
assert.ok(html.includes('mobile-more'));
```

- [ ] **Step 2: 运行测试**

Run:

```bash
node --test
```

Expected: PASS。

---

## Self-Review

- 覆盖需求：FAV 收起态不截断；右下角由播放改为更多；更多面板包含非音乐功能；桌面端不变；与音乐坞展开隐藏兼容
- 无占位符：每一步都有具体 DOM/CSS/handler

