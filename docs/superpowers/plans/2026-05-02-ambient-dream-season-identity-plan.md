# Ambient Dream 四季辨识强化（方案 B）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变交互逻辑前提下，让春夏秋冬在 0.3 秒内凭粒子形态可辨，同时补强色温光晕与便签纸感，并保证正文可读性与性能降级路径。

**Architecture:** 复用现有 `season-layer-far/mid` 作为色温光晕通道；增强 `seasonCanvas` 粒子系统为按季节“签名形态”渲染，并加入正文清晰区避让与季节切换“换气”包络；保持 reduced-motion 与 FPS 降级。

**Tech Stack:** 单文件 HTML（React UMD + GSAP Draggable + Canvas 2D）

---

### Files

- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)
- Reference: [season-identity-design.md](file:///workspace/docs/superpowers/specs/2026-05-02-ambient-dream-season-identity-design.md)

---

### Task 1: 强化四季色温光晕（CSS）

**Files**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)（`.season-far.*` / `.season-mid.*`）

- [ ] **Step 1: 为每季增加 1 个“主色温”radial，高辨识但保持低强度**

把每季 `background` 的 radial 组合补强为：`基底(深色) + 主色温高光(单一色相) + 辅助柔光(中性)`，并保持：

- 春：粉紫高光偏上半部左侧
- 夏：蓝紫高光偏右上
- 秋：米金高光偏左下
- 冬：青灰高光偏上部边缘

- [ ] **Step 2: 手动验收**

打开页面滚动生成 6+ 便签触发季节后，快速切换到不同季节，确认单看背景（不看粒子）也能感知色温不同，但正文仍清晰。

---

### Task 2: 粒子形态签名（Canvas 2D）

**Files**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)（`spawnSeasonParticle / stepSeasonParticle / drawSeasonParticle / getTargetCount`）

- [ ] **Step 1: 将 `spawnSeasonParticle` 升级为“按季节 kind”**

新增 `p.kind`：
- spring: `petal`
- summer: `firefly`
- autumn: `leaf`
- winter: `fog` 与 `snow` 混合（按比例生成）

- [ ] **Step 2: 为 summer 实现“萤火虫（更亮更闪）”**

渲染策略：小圆点 + `shadowBlur` 柔光；闪烁由 `tw` 与时间合成；运动为慢游走 + 微上浮。

- [ ] **Step 3: 为 winter 实现“雾气为主”**

渲染策略：fog 粒子为大而极低对比的柔光圆/雾团（只在暗部“感知到”），snow 为少量细雪点；两者均受正文清晰区避让影响。

- [ ] **Step 4: 手动验收**

在每季截图验证：
- 春花瓣形态明显
- 夏“亮点闪烁”明显
- 秋叶片更大且旋落明显
- 冬雾气明显但不糊字；雪点只是点缀

---

### Task 3: 正文清晰区避让（Canvas 2D）

**Files**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)（season vfx loop 与粒子 tick）

- [ ] **Step 1: 每帧计算 `activeTextRef` 的屏幕 rect，并映射到 canvas 坐标**

输出一个 `clearZone`（中心点 + 半径 或 rect + padding），并传给 tick。

- [ ] **Step 2: 避让策略**

至少满足：
- 粒子出生点尽量避开清晰区
- 粒子进入清晰区时 alpha 乘以衰减（或直接替换/推离）

- [ ] **Step 3: 手动验收**

在粒子最明显的春/冬，确认正文区域不会被粒子遮挡或造成闪烁干扰。

---

### Task 4: 季节切换“换气”包络（dip → recover）

**Files**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)

- [ ] **Step 1: 记录季节切换开始时间（ref）**

在 `isSeasonTransitioning` 变为 true 时记录 `transitionStartMs`，在 loop 中计算 `p=(t-start)/1400`。

- [ ] **Step 2: 应用 envelope**

在切换窗口内：
- 前 200ms：强度下降（粒子数量/alpha）
- 末 400ms：强度回升并略增强

强度变化作用于 `getTargetCount` 与粒子 alpha（避免突然闪烁）。

- [ ] **Step 3: 手动验收**

切换时感知到“换气”，但不会出现明显闪烁或卡顿。

---

### Task 5: 便签纸感微差异（CSS）

**Files**
- Modify: [ambient-dream-v2.html](file:///workspace/ambient-dream-v2.html)（`.season-xxx .memory-note::after` 与必要的轻微滤镜）

- [ ] **Step 1: 为四季微调边缘/纸感**

约束：只改轻微边缘色相、细微 blur/opacity 倾向，不改变便签可读性与 GSAP 交互。

- [ ] **Step 2: 手动验收**

便签在 hover/拖拽/聚焦下仍稳定，不出现明显“脏边/糊字”。

---

### Task 6: 总体验收截图

- [ ] **Step 1: 统一截图条件**

同一段正文、同一 viewport 下分别截图 spring/summer/autumn/winter。

- [ ] **Step 2: 验收 checklist**

- 0.3 秒内可靠粒子形态分清四季
- 正文清晰区不被粒子干扰
- 冬为雾气主导、夏为萤火虫主导
- reduced-motion 下粒子自动弱化
- FPS 低时自动降级仍可辨季节

