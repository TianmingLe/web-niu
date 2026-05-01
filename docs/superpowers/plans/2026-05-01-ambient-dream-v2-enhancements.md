# Ambient Dream v2 Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复目录滚动、实现目录缩略/详情双样式与整理分层分页，并补齐自动保存/导入导出/错误提示/搜索定位/撤销/音乐自动播放与播放列表等需求。

**Architecture:** 继续保持单文件 React（Babel in-browser）架构；新增少量 UI 状态与持久化（localStorage + 可选 IndexedDB）；整理视图用“分页/分层”对便签列表做虚拟化式切分，避免无限延伸。

**Tech Stack:** 单页 HTML（React 18 UMD + Babel）、GSAP/Draggable、WebAudio（AnalyserNode）、localStorage、Fetch（/music/ 目录解析）

---

## Files & Ownership

**Modify**
- [/workspace/ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

**Optional (if extracted later, not required now)**
- 无（本次不做拆文件，保持现有单页结构）

---

## Acceptance Criteria (From Requirements)

### P0
- 目录（语录目录弹窗）可自然滚动，不被全局滚轮拦截。
- 语录目录提供两种样式：缩略版（列表预览 + 点击进入详情编辑）与详情版（现有多 textarea）。
- 点击“整理”后不再把内容无限往下排；改为分层/分页显示，可切换下一层查看整理结果。
- 自动保存：关键数据每次变更自动保存到 localStorage，刷新不丢失。
- 导出/导入：支持导出 JSON 备份，支持导入恢复。
- 错误处理：音乐加载失败、存储失败有用户可见提示。
- 音乐：进入页面自动播放（尽最大努力）；排查并降低播放过程“杂电音”概率。

### P1
- 搜索：在整理视图可搜索便签内容，并定位到所在层（切到对应层并高亮/聚焦）。
- 撤销：Ctrl+Z 或按钮撤销上一步（至少覆盖便签的新增/删除/整理分页/移动/文本变更等）。
- 播放列表：显示当前 /music/ 文件夹音乐，支持切换曲目（现有基础上补齐失败提示、刷新与更可靠去重）。

### P2
- 移动端适配：查看与编辑至少可用（目录滚动、整理分页切换、搜索、导入导出、音乐控制可触达）。
- 快捷键：Delete 删除选中便签；Esc 关闭弹窗/退出整理视图。
- 便签颜色/标签分类：本次先预留结构，不强制实现（若实现，以不破坏现有主题体系为准）。

---

## Testing Strategy

本仓库无测试框架与构建工具，采用“可复现的手动验收步骤 + 最小自动化烟测（可选）”：

- 手动验收：通过 `python -m http.server` 打开 `/ambient-dream-v2.html`，按每个 Task 的“验证步骤”逐条检查。
- 可选烟测：如需要可加 Playwright，但当前代码库未引入 Node 依赖，本计划不强依赖。

---

## Task 1: 修复目录滚动与全局滚轮拦截

**Files:**
- Modify: [/workspace/ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)（全局 wheel/touch 监听）

- [ ] **Step 1: 调整 wheel/touch 拦截条件**
  - 目标：当 `isModalOpen` 或 `isDirectoryOpen` 打开时，不阻止默认滚动/触摸滚动，并且不触发“下一句”切换。
  - 实现点：全局监听里将 `isDirectoryOpen` 纳入拦截豁免；并把 `e.preventDefault()` 放到“确认需要拦截时”才调用（避免影响弹窗内部滚动）。

- [ ] **Step 2: 手动验证**
  - 打开“目录”弹窗，滚轮可滚动 `.quote-list`。
  - 打开“+”弹窗，textarea 可滚动。
  - 弹窗打开时滚轮不触发“下一句”切换。

---

## Task 2: 语录目录双模式（缩略/详情）

**Files:**
- Modify: [/workspace/ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)（QuoteDirectoryModal + CSS）

- [ ] **Step 1: 数据结构与状态**
  - 在 `QuoteDirectoryModal` 内新增：
    - `viewMode: 'compact' | 'detail'`
    - `selectedIndex`（缩略版选中的条目）
    - `drafts` 仍为语录数组（现有）

- [ ] **Step 2: 缩略版 UI**
  - 上方工具条增加切换按钮：缩略 / 详情
  - 列表项只显示一行预览（截断显示），点击后在“详情编辑区”展示完整 textarea + 删除按钮。

- [ ] **Step 3: 详情版 UI**
  - 保留现有 `drafts.map -> textarea` 的列表编辑能力。

- [ ] **Step 4: 可用性与移动端**
  - 缩略版列表保持可滚动；详情编辑区在小屏下占满宽度，确保可编辑与可点按。

- [ ] **Step 5: 手动验证**
  - 缩略/详情切换不丢输入内容。
  - 缩略版：点击某条后能编辑并保存。
  - 删除、增加语录仍正常。

---

## Task 3: 整理分层/分页视图（替代无限下延）

**Files:**
- Modify: [/workspace/ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)（App + CSS + MemoryNote/notes-layer）

- [ ] **Step 1: 新增“整理视图”状态**
  - 新增状态：
    - `arrangeMode: boolean`
    - `arrangePageIndex: number`
    - `arrangePageSize`（根据 viewportProfile 推导）
  - 点击“整理”后：进入 `arrangeMode=true`，`arrangePageIndex=0`。

- [ ] **Step 2: 分层渲染**
  - 基于 `droppedNotes` 按 index 切片为当前层：`pageNotes = droppedNotes.slice(start, end)`
  - `notes-layer` 渲染只渲染 `pageNotes`（避免无限延伸）。
  - `arrangeNotes()` 改为“计算每页布局 + 为当前页设置 pos”，或统一为“每页布局规则一致、每页基于局部 index 排布”。

- [ ] **Step 3: 分层切换 UI**
  - 在 controls 增加：
    - `上一层` / `下一层`
    - 展示 `第 X / N 层`
    - `退出整理`（回到自由散落/完整便签层渲染）

- [ ] **Step 4: 手动验证**
  - 便签很多时，“整理”后画布不再向下延伸。
  - 下一层/上一层切换正确，层数正确。
  - 退出整理后回到原有交互（可自由拖拽、散落）。

---

## Task 4: 自动保存（localStorage）与失败提示（P0）

**Files:**
- Modify: [/workspace/ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 扩展 STORAGE_KEYS**
  - 新增 keys：
    - `notes`（droppedNotes）
    - `arrange`（整理视图相关：arrangeMode/pageIndex 等）
    - `directoryViewMode`（语录目录视图偏好）
    - `appBackupVersion`（导入导出版本号）

- [ ] **Step 2: safeWriteStorage/safeReadStorage 改为可报告错误**
  - `safeWriteStorage` 返回 `{ ok: boolean, error?: string }`（或 `boolean`）
  - App 侧统一通过 `pushToast()` 提示：
    - 写入失败：提示“存储失败，可能空间不足”

- [ ] **Step 3: droppedNotes 持久化**
  - 初始化时从 storage 恢复（若无则空数组）
  - 任意新增/删除/移动/整理后写回 storage

- [ ] **Step 4: 手动验证**
  - 新增便签、整理、切换层、修改语录、收藏等操作后刷新页面仍保留。
  - 人为触发 localStorage 写入异常（浏览器无痕/禁用或容量满）时出现提示。

---

## Task 5: 导出/导入 JSON 备份（P0）

**Files:**
- Modify: [/workspace/ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 统一备份结构**
  - 定义 `exportPayload = { version, exportedAt, comments, droppedNotes, favorites, settings, music }`
  - `settings` 至少包含：volume/orderMode/currentTrackIndex
  - `music.tracks`：仅包含可复原的 url/name/source（上传音乐若为 dataURL 可包含；若体积过大则提示并允许用户选择不包含）

- [ ] **Step 2: UI 放置**
  - 推荐放在“语录目录”弹窗工具条里新增“导出备份 / 导入备份”按钮（避免新增过多入口）。
  - 导入使用 `<input type="file" accept="application/json">` 读取 JSON 并覆盖恢复。

- [ ] **Step 3: 导入校验与错误提示**
  - 校验 version、必需字段类型
  - 失败提示“备份文件格式不正确/版本不兼容”

- [ ] **Step 4: 手动验证**
  - 导出后清空存储/刷新，导入可恢复语录、便签、收藏与设置。

---

## Task 6: 音乐自动播放、加载失败提示、降低杂音概率（P0）

**Files:**
- Modify: [/workspace/ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 自动播放策略**
  - 页面进入后：当 `tracks.length > 0` 且 `currentTrackIndex >= 0`，尝试自动播放：
    - 先设置 `audio.muted=true` 调 `play()`；成功后取消静音并恢复音量
    - 若失败，记录 `pendingAutoplay=true`，在用户首次 click/keydown 交互时自动 `resume+play`

- [ ] **Step 2: 音频错误提示**
  - 监听 `audio.error`、`stalled`（或 `canplay` 超时）：
    - 提示“音乐加载失败，可能文件不可用或路径错误”

- [ ] **Step 3: WebAudio 连接方式调整**
  - 将链路从 `source -> analyser -> destination` 调整为：
    - `source -> destination`
    - `source -> analyser`（分析器不再串行影响输出）

- [ ] **Step 4: 手动验证**
  - 进入页面（有默认 /music/）时自动尝试播放；若浏览器拦截，首次点击页面后能开始播放。
  - 人为断开音乐链接（改错 url）可出现提示。
  - 长时间播放不出现明显爆音/杂音（无法 100% 保证，但链路更稳）。

---

## Task 7: 搜索并定位到层（P1）

**Files:**
- Modify: [/workspace/ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 整理视图搜索输入**
  - 在整理视图 controls 增加搜索框与“上一条/下一条”按钮
  - 搜索仅在 `arrangeMode=true` 时显示

- [ ] **Step 2: 匹配与定位**
  - 计算匹配的 note index 列表
  - 根据匹配项 index 计算所在 `pageIndex = Math.floor(index / pageSize)`，自动切换到对应层并聚焦该 note（设置 `focusedNoteId` 或临时高亮）

- [ ] **Step 3: 手动验证**
  - 输入关键字能跳到对应层，目标便签明显可见并高亮。

---

## Task 8: 撤销（Ctrl+Z / 按钮）（P1）

**Files:**
- Modify: [/workspace/ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 历史栈设计**
  - 保存快照（建议限制 30 步）：
    - `droppedNotes`
    - `comments`（可选）
    - `favorites`（可选）
    - `arrangeMode/pageIndex`
  - 提供 `pushHistory()` 与 `undo()`。

- [ ] **Step 2: 接入关键操作**
  - 新增便签、删除便签、整理、拖拽结束、导入备份、清空便签 等都 pushHistory。

- [ ] **Step 3: 快捷键与按钮**
  - `Ctrl+Z` / `Cmd+Z` 触发 undo
  - controls 增加“撤销”按钮（在移动端也可用）

- [ ] **Step 4: 手动验证**
  - 连续操作后 Ctrl+Z 可逐步回退。
  - 撤销后 localStorage 同步更新。

---

## Task 9: 播放列表增强（P1）

**Files:**
- Modify: [/workspace/ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: /music/ 重新扫描按钮**
  - 在音乐坞中加入“刷新曲库”按钮，重新 fetch `/music/` 并更新 tracks（保留用户上传 tracks，做去重）。

- [ ] **Step 2: 错误提示**
  - fetch `/music/` 失败时提示（网络/目录不可列出）

- [ ] **Step 3: 手动验证**
  - 点击刷新后能看到新增的 mp3 文件（若目录可列出）。

---

## Task 10: 移动端/快捷键/删除选中（P2）

**Files:**
- Modify: [/workspace/ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: Esc 关闭弹窗/退出整理**
  - 监听 keydown：若目录/添加弹窗开则关闭；否则若整理视图开则退出整理。

- [ ] **Step 2: Delete 删除选中便签**
  - 若 `focusedNoteId` 存在则删除对应便签（并 pushHistory）

- [ ] **Step 3: 移动端点击命中与布局微调**
  - 确保 controls、目录切换、搜索、导入导出按钮在小屏不溢出，触控可点。

- [ ] **Step 4: 手动验证**
  - 手机尺寸下可打开目录、滚动、编辑、整理分页、播放控制与导入导出。

---

## Spec Coverage Quick Check

- 目录无法滚动：Task 1
- 缩略版/详情版：Task 2
- 整理分层分页：Task 3
- 自动保存/刷新不丢：Task 4
- 导入导出：Task 5
- 错误提示：Task 4 + Task 6 + Task 9
- 搜索定位层：Task 7
- 撤销：Task 8
- 播放列表/切歌：Task 9（现有基础增强）
- 移动端/快捷键：Task 10

