# Ambient Dream UI Profile Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏现状体验的前提下，为 `ambient-dream-v2.html` 增加 `classic/refined` 两套界面呈现版本，并在右上收藏面板旁提供一键切换，默认跟随上次选择。

**Architecture:** 单文件 React（Babel in-browser）里新增 `uiProfile` 状态与 localStorage 持久化；通过给 `.main-stage` 注入 `ui-classic/ui-refined` class 做 CSS 覆盖，并在 Refined 下对“阅读态隐身/整理工具折叠/文案口径收敛”做渐进披露。

**Tech Stack:** 单页 HTML（React 18 UMD + Babel）、localStorage、现有 CSS class 覆盖策略

---

## Files & Ownership

**Modify**
- [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

**Create**
- [docs/superpowers/specs/2026-05-01-ambient-dream-ui-profile-toggle-design.md](file:///workspace/docs/superpowers/specs/2026-05-01-ambient-dream-ui-profile-toggle-design.md)（已完成）

---

### Task 1: 新增 uiProfile 状态与持久化

**Files:**
- Modify: [ambient-dream-v2.html:L1474-L1490](file:///workspace/ambient-dream-v2.html#L1474-L1490)
- Modify: [ambient-dream-v2.html:L1788-L1840](file:///workspace/ambient-dream-v2.html#L1788-L1840)
- Modify: [ambient-dream-v2.html:L1867-L1871](file:///workspace/ambient-dream-v2.html#L1867-L1871)

- [ ] **Step 1: 扩展 STORAGE_KEYS**

在 `STORAGE_KEYS` 增加一项：

```js
uiProfile: 'ambient-dream-ui-profile',
```

- [ ] **Step 2: 在 App state 初始化 uiProfile（默认 classic，跟随上次选择）**

在 `App` 的 state 区域（紧邻 `mode` 初始化处）增加：

```js
const [uiProfile, setUiProfile] = React.useState(() => {
  const stored = safeReadStorage(STORAGE_KEYS.uiProfile, 'classic');
  return stored === 'refined' ? 'refined' : 'classic';
});
```

- [ ] **Step 3: 持久化 uiProfile（复用 writeStorage）**

在已有 `useEffect` 的持久化区（参考 `mode/tagPalette/directoryViewMode` 的写入方式）增加：

```js
React.useEffect(() => {
  writeStorage(STORAGE_KEYS.uiProfile, uiProfile);
}, [uiProfile, writeStorage]);
```

- [ ] **Step 4: 手动验证**
  - 刷新前切到 refined，刷新后仍是 refined
  - 清空 localStorage 的 `ambient-dream-ui-profile` 后刷新，回到 classic

---

### Task 2: 在 main-stage 注入 ui class（用于 CSS 覆盖）

**Files:**
- Modify: [ambient-dream-v2.html:L3117-L3120](file:///workspace/ambient-dream-v2.html#L3117-L3120)

- [ ] **Step 1: main-stage className 追加 uiProfile**

将：

```jsx
<div className={`main-stage viewport-${viewportProfile.mode} mode-${mode}`}>
```

改为：

```jsx
<div className={`main-stage viewport-${viewportProfile.mode} mode-${mode} ui-${uiProfile}`}>
```

（这样会生成 `ui-classic` / `ui-refined`）

- [ ] **Step 2: 手动验证**
  - 在浏览器 DevTools 里确认 `.main-stage` 会随切换出现 `ui-classic` / `ui-refined`

---

### Task 3: 右上加入 UI Profile 切换按钮

**Files:**
- Modify: [ambient-dream-v2.html:L3420-L3440](file:///workspace/ambient-dream-v2.html#L3420-L3440)
- Modify: [ambient-dream-v2.html (CSS favorites 样式区域)](file:///workspace/ambient-dream-v2.html#L775-L820)

- [ ] **Step 1: 增加切换按钮（紧挨“钉”按钮）**

在 `.favorites-head` 内，将目前只有“钉”的位置扩展为两枚按钮：

```jsx
<button
  type="button"
  className="profile-toggle-btn"
  onClick={() => setUiProfile(prev => prev === 'classic' ? 'refined' : 'classic')}
  title="切换界面呈现，不影响内容"
>
  {uiProfile === 'classic' ? '沉浸+' : '经典'}
</button>
```

（文案可选 `原版/改进版`，但本计划默认 `经典/沉浸+`，以减少“产品设置”味道）

- [ ] **Step 2: 为按钮增加样式（小胶囊、低存在感但可点击清晰）**

新增样式建议（与现有雾面材质一致）：

```css
.profile-toggle-btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(244, 240, 235, 0.86);
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.08em;
}

.profile-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.10);
  border-color: rgba(255, 255, 255, 0.22);
}
```

- [ ] **Step 3: 手动验证**
  - 右上按钮可见、可点击切换
  - 切换只改变呈现，不影响便签/收藏/音乐数据

---

### Task 4: Refined（改进版）最小可感知差异：阅读态“隐身化”

**Files:**
- Modify: [ambient-dream-v2.html (CSS: controls/music-dock/favorites-panel)](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 为 Refined 阅读态增加低存在感样式（不改变行为，仅改变权重）**

新增 CSS 覆盖（示意，实际数值可按预览微调）：

```css
.ui-refined.mode-reading .controls {
  opacity: 0.16;
  transform: translateY(6px) scale(0.985);
}

.ui-refined.mode-reading .controls:hover {
  opacity: 1;
  transform: none;
}

.ui-refined.mode-reading .music-dock,
.ui-refined.mode-reading .favorites-panel {
  opacity: 0.74;
}

.ui-refined.mode-reading .music-dock:hover,
.ui-refined.mode-reading .favorites-panel:hover {
  opacity: 1;
}
```

说明：这里不引入新的“抽屉”状态，先用视觉权重让 Refined 的沉浸感立刻可感知，Classic 完全不受影响。

- [ ] **Step 2: 手动验证**
  - classic 下观感保持原样（除多了一个切换按钮）
  - refined 下阅读态明显更“隐身”，但鼠标/触摸仍可操作

---

### Task 5: Refined 整理态渐进披露：折叠分组/筛选/搜索

**Files:**
- Modify: [ambient-dream-v2.html:L1788-L1840](file:///workspace/ambient-dream-v2.html#L1788-L1840)
- Modify: [ambient-dream-v2.html:L3275-L3412](file:///workspace/ambient-dream-v2.html#L3275-L3412)

- [ ] **Step 1: 新增 arrangePanelOpen 状态**

在 App state 区域新增：

```js
const [arrangePanelOpen, setArrangePanelOpen] = React.useState(false);
```

并在 `exitArrangeMode()` 里重置为 `false`（避免下次进入保持展开）：

```js
setArrangePanelOpen(false);
```

- [ ] **Step 2: 在 Refined + 整理态加入“面板”开关**

在 `arrangeMode && mode === 'editing'` 的 controls 区域，新增一个按钮：

```jsx
{arrangeMode && mode === 'editing' && uiProfile === 'refined' && (
  <button
    type="button"
    className={`music-mini-btn ${arrangePanelOpen ? 'active' : ''}`}
    onClick={() => setArrangePanelOpen(prev => !prev)}
    title="展开/收起整理面板"
  >
    面板
  </button>
)}
```

- [ ] **Step 3: 仅在 Classic 或面板展开时展示分组/筛选/搜索块**

定义一个布尔值（就地变量即可）：

```js
const showArrangeTools = uiProfile === 'classic' || arrangePanelOpen;
```

然后把现有 3 个块：
- `.arrange-groups-wrap`
- `.arrange-filter-wrap`
- `.arrange-search-wrap`

的渲染条件改为：

```jsx
{arrangeMode && mode === 'editing' && showArrangeTools && ( ... )}
```

- [ ] **Step 4: 手动验证**
  - classic：整理态表现不变
  - refined：整理态默认更收敛，点“面板”才出现分组/筛选/搜索

---

### Task 6: 可达性底座（两版都收益）：补齐 focus-visible 与按钮语义

**Files:**
- Modify: [ambient-dream-v2.html (CSS: button/input styles)](file:///workspace/ambient-dream-v2.html)
- Modify: [ambient-dream-v2.html:L3275-L3412](file:///workspace/ambient-dream-v2.html#L3275-L3412)
- Modify: [ambient-dream-v2.html:L3420-L3448](file:///workspace/ambient-dream-v2.html#L3420-L3448)

- [ ] **Step 1: 为关键可点击控件添加 focus-visible 样式**

新增（或补齐）：

```css
.soft-icon-btn:focus-visible,
.add-btn:focus-visible,
.panel-icon-btn:focus-visible,
.music-mini-btn:focus-visible,
.tiny-btn:focus-visible,
.profile-toggle-btn:focus-visible,
.style-btn:focus-visible,
.modal-input:focus-visible,
.modal-content textarea:focus-visible {
  outline: 2px solid rgba(168, 149, 184, 0.72);
  outline-offset: 2px;
}
```

- [ ] **Step 2: 将 controls 区域的“可点击 div”改为 button（保持 class 不变，尽量不影响视觉）**

把右下 controls 内的：

```jsx
<div className="soft-icon-btn" onClick=...>...</div>
```

改为：

```jsx
<button type="button" className="soft-icon-btn" onClick=...>...</button>
```

同理处理 `label-btn` 与 `add-btn`（`+`）等。

- [ ] **Step 3: favorites 头部的可点击区域也使用 button**

将：

```jsx
<div className="favorites-head-main" onClick=...>
```

改为 `<button type="button" className="favorites-head-main" ...>`，并确保现有样式不受影响（必要时补 `.favorites-head-main { background: transparent; border: none; }`）。

- [ ] **Step 4: 手动验证**
  - Tab 可依次聚焦右下 controls、右上 favorites 的按钮
  - focus-visible 明显可见
  - Enter/Space 可触发按钮

---

### Task 7: 手动验收清单

- [ ] **Step 1: 本地启动**

Run:

```bash
python -m http.server 8011
```

打开：`http://localhost:8011/ambient-dream-v2.html`

- [ ] **Step 2: Profile 切换与持久化**
  - 右上按钮切换 classic/refined
  - 刷新后保持上次选择

- [ ] **Step 3: Classic 保真**
  - Classic 下 controls、music-dock、favorites 的观感与交互保持现状（除新增切换按钮）

- [ ] **Step 4: Refined 可感知差异**
  - 阅读态更“隐身”（但仍可操作）
  - 整理态默认更收敛，“面板”按钮可展开分组/筛选/搜索

- [ ] **Step 5: 可达性基础**
  - 键盘 Tab 可聚焦主要按钮，且 focus-visible 清晰

---

## Plan Self-Review

- 覆盖 spec：默认跟随上次选择、入口在右上、Classic 保持不变、Refined 渐进披露与沉浸权重提升、两版共享数据。
- 无占位符；每个任务有明确文件位置、代码片段与验收步骤。

