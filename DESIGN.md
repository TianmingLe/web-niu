---
name: Ambient Dream
description: "沉浸式梦境便签桌：温柔、梦幻、诗意，但在需要时可被整理与再次找到"
colors:
  neutral-bg: "#101118"
  neutral-surface: "#ffffff0f"
  neutral-border: "#ffffff24"
  text-primary: "#f4f0ebea"
  text-muted: "#f4f0eb85"
  primary: "#a895b8"
  secondary: "#98aebb"
  tertiary: "#8fa58f"
  accent-ink: "#7f809a"
typography:
  display:
    fontFamily: "Noto Serif SC, Songti SC, Georgia, serif"
    fontSize: "clamp(2rem, 4vw, 2.5rem)"
    fontWeight: 300
    lineHeight: 1.8
    letterSpacing: "2px"
  body:
    fontFamily: "Noto Serif SC, Songti SC, Georgia, serif"
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Noto Serif SC, Songti SC, Georgia, serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.12em"
rounded:
  sm: "12px"
  md: "16px"
  lg: "20px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "10px"
  md: "14px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
components:
  button-soft:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    width: "52px"
    height: "52px"
  chip-tag:
    backgroundColor: "#0a0a0e59"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
---

# Design System: Ambient Dream

## 1. Overview

**Creative North Star: "睡前的便签桌面"**

这是一个介于品牌氛围与产品工具之间的界面：默认把操作藏起来，让用户像听一段音乐那样“停留”，但当用户想整理时，界面能迅速切换到清晰可控的工具态。整体情绪应当温柔、梦幻、诗意，低刺激，不催促。

反向约束同样重要：它不能长得像普通效率工具，也不能滑向赛博霓虹的躁动。所有控件都应像同一种材质做出来的，边缘柔和、对比克制，但关键阅读与点击必须清楚。

**Key Characteristics:**
- 氛围优先，工具渐进出现
- 暗背景下的清晰层级（高对比偏好）
- 色弱友好，选中态不只靠颜色

## 2. Colors

颜色是一组“低饱和的雾色系”，用于营造夜间的安静与漂浮感，并把强调色限制在少量关键交互与标签上。

### Primary
- **柔雾薰衣草** ({colors.primary}): 用于温柔的强调，尤其是标签与小范围高亮，避免大面积铺色

### Secondary (optional — omit if the project has only one accent)
- **灰蓝薄雾** ({colors.secondary}): 用于辅助强调与对比（如次级高亮、轻提示）

### Tertiary (optional)
- **静谧苔绿** ({colors.tertiary}): 用于柔和的“可被区分”状态，例如筛选与分组的补充色点

### Neutral
- **夜色底** ({colors.neutral-bg}): 页面底色，避免纯黑，保留一点温度
- **薄面板** ({colors.neutral-surface}): 面板/按钮的默认承载面，靠透明度而非纯色堆叠
- **轻边界** ({colors.neutral-border}): 边界只用于建立可点击性与分层，不用于强分割
- **主文字** ({colors.text-primary}): 阅读文字的主色，必须清晰稳定
- **弱文字** ({colors.text-muted}): 说明、计数、次要信息，永远不抢正文

### Named Rules (optional, powerful)

**The Quiet Accent Rule.** 强调色永远是“少量且有理由”的，不要把标签色当作大面积装饰底色。

## 3. Typography

**Body Font:** Noto Serif SC / Songti SC / Georgia（衬线为主，让文字更像“被写下来的句子”）

**Character:** 字体要像纸面上的低声旁白，字距略松，行距偏舒展；信息密度宁可低一点，也不要硬挤清楚。

### Hierarchy
- **Display**（300，clamp(2rem–2.5rem)，1.8，2px）：主句子/中心文本
- **Body**（400，1.1rem，1.6）：便签正文与主要内容
- **Label**（400，12px，0.12em）：工具区标签、统计、分类名

### Named Rules (optional)

**The Breath Rule.** 正文行距偏松（1.6–1.8），把留白当成情绪的一部分。

## 4. Elevation

该系统的“深度”更多依赖模糊与透明叠层，而不是硬朗的投影。阴影用于制造柔软的漂浮与聚焦，而不是卡片式的结构分隔。

### Named Rules (optional)

**The Soft Edge Rule.** 分层靠透明度与轻边界完成，避免厚重阴影与强对比分割线。

## 5. Components

### Buttons
- **Soft Icon Button（soft-icon-btn）:** 圆形、雾面承载（52px），hover 轻微放大与亮度提升；用于“低频但关键”的操作入口
- **Mini Button（music-mini-btn）:** 小尺寸、可密集排列；必须有清晰的 active 状态与键盘 focus 样式，避免只靠颜色区别

### Chips (if used)
- **Tag Pill（note-tag-pill）:** 胶囊形、带色点；点击切色/删除等操作要保证触控命中区足够大，删除交互要更明确

### Inputs / Fields
- **Modal Input / Textarea:** 深色半透明底 + 轻边界，focus 只做边界增强，不用夸张发光，避免破坏氛围

### Navigation
- **Arrange Controls（分组/筛选/搜索）:** 编辑态才出现；默认应收拢，避免占满底部导致“工具感”压过氛围

## 6. Do's and Don'ts

### Do:
- **Do** 在阅读模式把工具 UI 收起，只保留最少入口，让沉浸成为默认
- **Do** 用“文本 + 形状/选中态”辅助标签色点，保证色弱用户也能理解筛选状态
- **Do** 给所有可点击元素补齐 `:focus-visible`，并确保暗背景下对比足够清晰

### Don't:
- **Don't** 让界面变成普通效率工具/SaaS 风（标准卡片网格、强对齐、强信息密度、后台气质）
- **Don't** 让界面滑向赛博霓虹风（高饱和荧光、强发光、躁动动效）
- **Don't** 用颜色作为唯一信息载体（尤其在筛选/选中/分组态）

