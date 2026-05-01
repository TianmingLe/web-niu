# Ambient Dream 标签/筛选/双模式（Tab 切换）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有单页 React 版本中加入“阅读/编辑双模式（Tab 切换）”、多标签+颜色、默认按标签分组的整理视图与筛选/搜索定位，并完成 localStorage 迁移与持久化。

**Architecture:** 继续保持单文件 `/workspace/ambient-dream-v2.html`，在 App state 中新增 `mode/tagPalette/filter/grouping` 等状态；对 `droppedNotes` 做一次加载时迁移（兼容旧 `tag` 字段），并把标签/模式/筛选状态持久化到 localStorage。

**Tech Stack:** React 18 UMD + Babel、GSAP/Draggable、localStorage、纯前端状态管理

---

## Files & Ownership

**Modify**
- [/workspace/ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

**Create**
- 无（保持单文件）

---

## Task 1: 增加 mode 状态与 Tab/长按切换

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 增加 storage key 与默认 mode**
  - 在 `STORAGE_KEYS` 增加：
    - `mode: 'ambient-dream-mode'`
  - 初始化 `mode`：
    - 从 localStorage 读取 `'reading' | 'editing'`（默认 `'reading'`）

- [ ] **Step 2: 实现 Tab 切换逻辑（非输入态生效）**

```js
React.useEffect(() => {
  const onKeyDown = (e) => {
    const tag = e.target?.tagName;
    const isEditing = tag === 'TEXTAREA' || tag === 'INPUT';
    if (e.key === 'Tab' && !isEditing) {
      e.preventDefault();
      setMode(prev => prev === 'reading' ? 'editing' : 'reading');
    }
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, []);
```

- [ ] **Step 3: 移动端长按空白切换**
  - 给 `.main-stage` 或背景容器添加 pointerdown/pointerup 计时器
  - 仅当点击目标不是便签/按钮/输入框时才触发长按
  - 长按阈值：600ms

- [ ] **Step 4: mode 持久化**
  - `useEffect(() => writeStorage(STORAGE_KEYS.mode, mode), [mode])`

- [ ] **Step 5: 手动验证**
  - 非输入态按 Tab 可以切换模式
  - 输入框里按 Tab 依然可正常聚焦切换（不拦截）
  - 移动端（模拟窄屏）长按空白可切换
  - 刷新后 mode 不丢

---

## Task 2: 引入 tagPalette 并完成 notes 迁移（兼容旧 tag）

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: storage key 与 state**
  - 在 `STORAGE_KEYS` 增加：
    - `tagPalette: 'ambient-dream-tags-palette'`
  - 新增 state：
    - `tagPalette`（默认从 storage 读取，fallback `[]`）

- [ ] **Step 2: 预设颜色盘**

```js
const TAG_COLORS = ['#a895b8','#98aebb','#8fa58f','#7f809a','#c8a7a7','#b1c6b1','#d0c3a8','#9fb6c4'];
```

- [ ] **Step 3: 迁移函数（加载 notes 时）**
  - 新增函数 `migrateNotesAndPalette(notes, palette)`：
    - 若 note.tag 存在且 note.tags 不存在 → 转为 `note.tags=[{name: note.tag, color: paletteColorOrDefault}]`
    - 将该标签写入 palette（按 name 去重），补齐颜色与 updatedAt
    - 返回 `{ notes: migratedNotes, palette: nextPalette, changed: boolean }`

- [ ] **Step 4: 在 App 初始化时执行迁移**
  - 读取 `droppedNotes` 后立即运行迁移并写回 storage（changed 才写）

- [ ] **Step 5: palette 持久化**
  - `useEffect(() => writeStorage(STORAGE_KEYS.tagPalette, tagPalette), [tagPalette])`

- [ ] **Step 6: 手动验证**
  - 旧数据（只有 tag）能自动迁移到 tags
  - 刷新后 tags/palette 存在且不重复

---

## Task 3: 便签结构升级为多标签 + 展示样式

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: note 数据模型**
  - 新建便签时写入：
    - `tags: []`（默认）
  - 保留兼容字段但不再写 `tag`

- [ ] **Step 2: MemoryNote 展示多标签**
  - 将当前单一 `.note-tag` 升级为 tags 列表渲染：
    - 每个 tag 显示色点或小胶囊（读取 `tag.color`）
  - 阅读模式下：标签淡化（opacity 更低）；编辑模式下：更清晰

- [ ] **Step 3: 样式**
  - 新增：
    - `.note-tags` 容器
    - `.note-tag-pill`（含色点/背景）
    - mode class：例如 `.mode-reading` / `.mode-editing`

- [ ] **Step 4: 手动验证**
  - tags 数据存在时可正常显示多个标签
  - 阅读/编辑模式切换时视觉差异合理

---

## Task 4: 新增/编辑便签的标签编辑 UI（仅编辑模式）

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 新增便签（AddNoteModal）支持选择标签**
  - 将现在的“标签（可选）”单输入升级为：
    - 输入框：输入新标签名，回车添加
    - 最近使用标签：从 tagPalette 展示 8 个可点击添加
    - 标签颜色：点击标签可换色（循环色盘）或从色盘选择
  - 产出 `tags` 数组传给 `handleAddCustomNote`

- [ ] **Step 2: 编辑已有便签标签（编辑模式）**
  - 在便签上点击标签区域打开轻量编辑浮层（或复用 modal）：
    - 增删标签、改色
  - 更新 note 后：
    - pushHistory()
    - 更新 droppedNotes
    - 同步更新 tagPalette 的 updatedAt/颜色

- [ ] **Step 3: 手动验证**
  - 仅在 editing 模式可编辑标签
  - 变更后刷新不丢
  - palette 会记录最近使用

---

## Task 5: 整理视图默认按标签分组 + 组内分页

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 分组状态与默认开启**
  - 新增 state：
    - `groupingEnabled` 默认 `true`（可写入 storage）
  - 筛选 state：
    - `selectedTags: string[]`
    - `includeUntagged: boolean`

- [ ] **Step 2: 计算 grouped view model**
  - 生成结构：
    - `groups: Array<{ key, label, color, noteIds: [], total, pages: number }>`
  - 规则：
    - 一个 note 多标签：进入多个组（OR 视角）；或只进入“第一个标签组”（需在实现前确定）
    - 未分类：固定组 `Untagged`
  - 组内分页：
    - `pageSize = arrangeMetrics.pageSize`
    - 当前层由 `(groupIndex, groupPageIndex)` 决定

- [ ] **Step 3: 导航条（组切换）**
  - 在整理工具区域增加 group navigator：
    - 标签色点 + 名称 + 数量
    - 点击切换组
  - 组内页切换沿用上一层/下一层（语义可改为上一页/下一页）

- [ ] **Step 4: visibleNotes 改为基于 group+page**
  - `visibleNotes` 来源从 `droppedNotes.slice(...)` 改为当前组选出的 noteIds 再取分页

- [ ] **Step 5: 手动验证**
  - 默认进入整理视图时按标签分组
  - 多标签便签在分组下表现符合设定
  - 未分类组存在

---

## Task 6: 筛选 + 搜索定位（正文 + 标签）

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 筛选 UI（编辑模式下显示）**
  - 展示 palette 标签列表，支持多选
  - 提供“未分类”开关
  - 提供“清空筛选”

- [ ] **Step 2: 搜索逻辑扩展**
  - `arrangeMatches` 以“筛选后的集合”为输入
  - 匹配范围：
    - `text`
    - `tags[].name`
  - 定位到命中项时，需要同步切换：
    - 当前 group（若启用分组）
    - 当前 groupPage
    - focusedNoteId

- [ ] **Step 3: 手动验证**
  - 筛选叠加搜索行为稳定且一致
  - 命中可跳转且聚焦可见

---

## Task 7: 持久化补齐与回归验收

**Files:**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 补齐 storage keys**
  - `groupingEnabled`
  - `selectedTags/includeUntagged`（可选：保存用户上次筛选状态）
  - `groupIndex/groupPageIndex`（可选：保存当前导航位置）

- [ ] **Step 2: 回归验收脚本（手动）**
  - 运行：`python -m http.server 8000`
  - 打开：`ambient-dream-v2.html`
  - 验收项：
    - Tab 切换模式
    - 标签创建/编辑/改色
    - 默认分组 + 组内翻页
    - 筛选 + 搜索定位
    - 刷新持久化
    - 导入旧备份/旧 notes 数据迁移

---

## Plan Self-Review

- 覆盖 spec：mode、palette、迁移、分组默认开、筛选/搜索定位、持久化均有对应 Task。
- 无 TBD/TODO 占位。
- API/字段命名一致：`mode`, `tagPalette`, `tags[]`, `groupingEnabled`, `selectedTags`.

