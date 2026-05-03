# Ambient Dream Vite 薄壳迁移 + Vercel 部署兼容 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 `ambient-dream-v2.html`（CDN + Babel Standalone）迁移到 Vite 构建产物（无外链 CDN、无 text/babel），并用 `music/manifest.json` 保留默认曲库能力，最终可直接部署到 Vercel 且用户体验不变。

**Architecture:** Vite 提供构建与静态产物输出；把原内嵌 Babel 脚本迁移到 `src/main.jsx`，依赖改为 npm import；静态资源放入 `public/` 保持 URL（`/music/*`、`/comments.json`）；构建前脚本扫描 `public/music` 生成 `public/music/manifest.json`，运行时读取 manifest（不依赖目录列表）。

**Tech Stack:** Vite + React + GSAP（npm 依赖），Node 脚本生成 manifest，Vercel 静态构建输出 `dist/`。

---

## File Structure

**Create**
- `package.json`
- `vite.config.js`（可选；默认配置够用则不建）
- `index.html`（Vite 入口）
- `src/main.jsx`
- `src/ambient-dream-utils.js`
- `scripts/generate-music-manifest.mjs`
- `public/ambient-dream-v2.html`（旧链接兼容跳转）
- `public/comments.json`（从根目录迁移）
- `public/music/*`（从根目录迁移）

**Modify**
- `README.md`（更新启动方式：npm + Vercel）
- `tests/index-redirect.test.js`（更新断言，确保入口与 key 仍存在）
- `ambient-dream-v2.html`（保留为 legacy 源参考或改为说明；不作为线上入口）

---

### Task 1: 初始化 Vite 基础结构

**Files:**
- Create: `/workspace/package.json`
- Create: `/workspace/index.html`
- Create: `/workspace/src/main.jsx`
- Create: `/workspace/public/ambient-dream-v2.html`

- [ ] **Step 1: 新建 package.json**

最小可用版本：

```json
{
  "name": "ambient-dream",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0 --port 4173",
    "prebuild": "node scripts/generate-music-manifest.mjs"
  },
  "dependencies": {
    "gsap": "^3.12.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: 新建 Vite index.html**

内容要点：
- `<div id="root"></div>`
- 用 `<script type="module" src="/src/main.jsx"></script>` 启动
- 保留原页面 meta / title（不影响表现）

- [ ] **Step 3: 旧链接兼容**

`public/ambient-dream-v2.html` 内容仅做跳转到 `/`：

```html
<!doctype html>
<meta charset="utf-8" />
<meta http-equiv="refresh" content="0; url=/" />
<script>location.replace('/')<\/script>
```

- [ ] **Step 4: npm 安装与基础启动验证**

Run:

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Expected:
- 控制台显示 Vite dev server running
- 浏览器访问 `/` 不 404（可先显示空白页，下一任务再填充）

---

### Task 2: 迁移静态资源到 public（保持 URL）

**Files:**
- Move: `/workspace/comments.json` -> `/workspace/public/comments.json`
- Move: `/workspace/music/*` -> `/workspace/public/music/*`

- [ ] **Step 1: 移动 comments.json**
- [ ] **Step 2: 移动 music 目录**
- [ ] **Step 3: 验证访问路径**

在 dev server 下确认：
- `/comments.json` 可访问
- `/music/<file>` 可访问

---

### Task 3: 生成 music manifest（保留曲库体验）

**Files:**
- Create: `/workspace/scripts/generate-music-manifest.mjs`
- Create: `/workspace/public/music/manifest.json`（构建时生成；仓库可提交生成结果以便可见）

- [ ] **Step 1: 编写脚本**

脚本行为：
- 扫描 `public/music` 目录
- 过滤 `manifest.json`
- 仅收集音频扩展名：`.mp3 .MP3 .wav .ogg`
- 输出到 `public/music/manifest.json`

- [ ] **Step 2: 本地运行并检查输出**

Run:

```bash
npm run prebuild
cat public/music/manifest.json | head -n 40
```

Expected:
- JSON 中 tracks 包含现有 music 文件

---

### Task 4: 迁移 ambient-dream 运行代码到 src/main.jsx（效果不变）

**Files:**
- Create: `/workspace/src/main.jsx`
- Create: `/workspace/src/ambient-dream-utils.js`
- Modify: `/workspace/index.html`（把原 `<style>` 原样迁入，保持效果）

- [ ] **Step 1: 迁移并改为 import**

`src/main.jsx` 顶部：

```js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import * as AmbientDreamUtils from './ambient-dream-utils';

gsap.registerPlugin(Draggable);
window.AmbientDreamUtils = AmbientDreamUtils;
```

迁移内容：
- 把原 `ambient-dream-v2.html` 的 Babel 脚本主体（组件、hooks、App、render）整体迁入
- 保持 localStorage key、交互逻辑与 CSS class 名一致

- [ ] **Step 2: 替换曲库扫描实现**

把原本 `fetch('/music/')` 的扫描改为：
- `fetch('/music/manifest.json')` → `tracks`
- 若失败：保留原行为（提示 + 允许上传）

- [ ] **Step 3: 本地 dev/preview 验证**

Run:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
npm run build
npm run preview
```

Expected:
- `/` 页面可用，交互正常
- 控制台无致命错误

---

### Task 5: 更新 README 与测试

**Files:**
- Modify: `/workspace/README.md`
- Modify: `/workspace/tests/index-redirect.test.js`

- [ ] **Step 1: README 改为 npm + Vercel 指南**

新增：
- 本地：`npm install && npm run dev`
- 生产：`npm run build && npm run preview`
- Vercel：导入仓库后默认识别 Vite，输出目录 `dist`

- [ ] **Step 2: 更新 Node tests**

保持测试为轻量字符串断言：
- `index.html` 存在 `src/main.jsx`
- `main.jsx` 包含 `ambient-dream-mobile-onboarding-v1` 或其它关键 key（防回归）

- [ ] **Step 3: 运行测试**

Run:

```bash
node --test
```

Expected: PASS。

---

## Self-Review

- 覆盖 spec：移除 CDN/Babel、Vite 构建、manifest 曲库、旧链接兼容、Vercel 可部署
- 占位符扫描：无 TBD/TODO
- 风险：移动 `music/` 与 `comments.json` 可能影响旧静态模式；保留 `public/ambient-dream-v2.html` 兼容旧路径

