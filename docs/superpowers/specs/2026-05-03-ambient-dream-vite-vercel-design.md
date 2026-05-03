---
title: Ambient Dream Vite 薄壳迁移 + Vercel 部署兼容设计稿
date: 2026-05-03
status: draft
scope: 将当前纯静态（CDN + Babel Standalone）迁移为 Vite 构建产物，保证视觉与交互不变并可直接部署到 Vercel
---

## 背景

当前项目是单页静态 HTML（`ambient-dream-v2.html`）+ 内嵌 `text/babel`（Babel Standalone 浏览器即时编译）+ 外链 CDN（unpkg/cdnjs）。

在 Vercel 上“能不能部署”与“部署后是否稳定可用”是两回事：纯静态可以部署，但浏览器即时编译与外链 CDN 会带来首屏慢、CDN 不稳定、地区网络不可达导致白屏等风险；同时 `fetch('/music/')` 依赖目录列表，在 Vercel 静态托管中通常不可用。

本设计稿目标是在不改变用户感知的视觉/交互（动效、布局、滚动翻句、音乐坞、收藏、更多面板、四季 Canvas）前提下，把运行方式迁移为 Vite 构建产物，并给 Vercel 兼容的曲库清单方案。

## 目标

- Vercel 一键部署成功，并且线上运行稳定
- 用户端“效果与交互”不变（允许改代码组织与依赖加载方式，但不能改变呈现/交互结果）
- 移除浏览器端 Babel Standalone（不再 `text/babel`）
- 移除外链 CDN 依赖（React/GSAP 从 npm 打包，避免 CDN 不可达）
- 保留默认曲库能力：仓库内 `music/` 目录的示例音乐可在页面里自动显示
- 保持 `/` 访问即进入成品页，并兼容旧链接 `/ambient-dream-v2.html`

## 非目标

- 不引入 Next.js/SSR/Edge Functions 等全栈能力
- 不重构 UI 组件架构（仍可保持单文件组织，迁移优先）
- 不改变数据存储语义（localStorage key 不改）

## 现状盘点（关键不兼容点）

1) 无 `package.json` / 构建系统：Vercel 无法自动识别框架与 build 输出目录。

2) `ambient-dream-v2.html` 使用：
   - `script type="text/babel"`（浏览器即时编译）
   - `https://unpkg.com/...`（React/ReactDOM/Babel）
   - `https://cdnjs.cloudflare.com/...`（GSAP/Draggable）
   这会导致线上不稳定与性能问题。

3) 曲库扫描：
   - 现有逻辑会 `fetch('/music/')` 解析目录列表
   - Vercel 静态托管通常不会返回目录索引页面，导致扫描失败

## 迁移方案（Vite 薄壳）

### 目录结构（目标）

- `index.html`（Vite 入口，取代当前 `ambient-dream-v2.html` 作为真正运行入口）
- `src/main.jsx`（由原 `ambient-dream-v2.html` 中的 React 逻辑迁移而来）
- `src/styles.css`（可选：若迁移阶段更稳，也可先继续内联在 `index.html`）
- `src/ambient-dream-utils.js`（由现有 `ambient-dream-utils.js` 迁移为 ES Module）
- `public/comments.json`（保留）
- `public/music/*`（保留示例音乐）
- `public/music/manifest.json`（新增：构建时生成或维护的曲库清单）
- `public/ambient-dream-v2.html`（新增：兼容旧路径，跳转到 `/`）

说明：
- `public/` 下的内容会被原样复制到 `dist/`，确保静态资源路径稳定。
- 若保留旧根目录文件（`ambient-dream-v2.html`、`ambient-dream.html`）可以先不删，但 Vercel 上最终入口走 `index.html`。

### 依赖与构建

新增 `package.json`（最小依赖）：
- `vite`
- `react`
- `react-dom`
- `gsap`

构建命令：
- `npm run build` → 产物输出到 `dist/`
- `npm run dev` 供本地验证

### 代码迁移策略（保证交互不变）

1) 把 `ambient-dream-v2.html` 里的 `<script type="text/babel">` 内容迁到 `src/main.jsx`：
   - `React`/`ReactDOM` 改为 `import React from 'react'`、`import { createRoot } from 'react-dom/client'`
   - `gsap`/`Draggable` 改为 `import { gsap } from 'gsap'`、`import { Draggable } from 'gsap/Draggable'` 并 `gsap.registerPlugin(Draggable)`
   - 保持逻辑与状态 key 完全一致（包括 autoplay、onboarding、mobile 布局等）

2) `ambient-dream-utils.js`：
   - 迁到 `src/ambient-dream-utils.js` 并改为导出函数
   - 在 `main.jsx` 里改为 `import * as AmbientDreamUtils from './ambient-dream-utils'`
   - 兼容现有用法（原先可能通过 `window.AmbientDreamUtils` 访问）：迁移后在 `main.jsx` 设置 `window.AmbientDreamUtils = AmbientDreamUtils`（仅为保持现有引用不改，避免大重构）

3) 样式：
   - 第一阶段：把 `ambient-dream-v2.html` 里的 `<style>` 原样拷贝到 `index.html`，避免 CSS 拆分引入差异
   - 第二阶段（可选）：再把 CSS 移到 `src/styles.css` 并 `import './styles.css'`

### 曲库扫描（manifest 兜底，保持体验）

目标：线上仍然能展示仓库内自带音乐列表。

方案：
- 新增 `public/music/manifest.json`，格式：

```json
{
  "version": 1,
  "generatedAt": "2026-05-03T00:00:00.000Z",
  "tracks": [
    { "name": "oldmemoroy", "file": "oldmemoroy.MP3" },
    { "name": "未闻花名钢琴", "file": "未闻花名钢琴.MP3" }
  ]
}
```

- 运行时逻辑改为：
  - 优先 `fetch('/music/manifest.json')` → 用 manifest 生成 tracks（url = `/music/${file}`）
  - 如果 manifest 不存在：回退到“仅上传音乐”（并提示用户“曲库清单缺失，可刷新/上传”）
  - 可保留旧的 `fetch('/music/')` 作为本地开发服务器（支持目录列表）时的 fallback，但线上以 manifest 为准

manifest 生成方式（二选一）：
1) **构建前脚本生成（推荐）**：在 `package.json` 的 `prebuild` 里跑一个 Node 脚本扫描 `public/music` 写 manifest
2) **手动维护**：每次新增音乐时手动更新 manifest（更简单但易遗漏）

优先采用 1），可确保上线永远同步。

### 旧链接兼容

保留 `public/ambient-dream-v2.html`：
- 内容只做 JS redirect 到 `/`，避免旧链接 404。

## Vercel 配置与部署

Vercel 识别：
- Framework Preset：Vite（自动识别 `package.json` + `vite`）
- Build Command：`npm run build`
- Output Directory：`dist`

无需 `vercel.json` 也可部署；如需强制路由或 headers，再增 `vercel.json`。

## 验收标准

- 本地：`npm install`、`npm run build`、`npm run preview` 可正常运行
- Vercel：部署成功后 `/` 可打开，且功能与当前版本一致
- 手机端：底部 `♥/目录/⋯`、更多面板、FAV 顶栏、音乐坞展开隐藏等行为一致
- 曲库：线上能看到 manifest 中的音乐列表；上传音乐仍可用
- 性能：首屏不再加载 Babel Standalone；不依赖 unpkg/cdnjs

## 风险与对策

- 音频大文件导致部署慢：可在后续将 `music/` 放到对象存储（非本设计稿范围）
- 若 `window.AmbientDreamUtils` 被其它脚本依赖：通过在 `main.jsx` 重新挂到 window 解决
- 若某些浏览器对 autoplay 更严格：保持现有“一次性提示 + 用户手势继续播放”的逻辑不变

