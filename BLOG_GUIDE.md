# Blog 写作与发布

Blog 地址：https://yichen-long.github.io/blog/

网站已支持独立 Blog 列表页和每篇文章的独立地址，样式与学术主页一致。你可以写中文或英文，正文使用 Markdown；提交到 GitHub 后自动构建、发布。

## 最简单的写作流程

1. 复制 `content/posts/_template.md`。
2. 文件改名为简短的英文名称，例如 `analog-sizing-notes.md`，仍放在 `content/posts/`。
3. 填写顶部信息和正文。
4. 写好后把 `draft: true` 改成 `draft: false`。
5. 在 GitHub 保存提交，等待 Actions 完成。

文章地址由文件名决定，例如 `analog-sizing-notes.md` 发布为 `https://yichen-long.github.io/blog/analog-sizing-notes.html`。发布后尽量保留文件名，避免已有外链失效。

## 顶部信息怎么填

```text
---
title: "文章标题"
date: "2026-10-29"
summary: "文章列表展示的一两句简介。"
tags: ["EDA", "3D-IC"]
draft: true
lang: "zh-Hans"
---
```

| 字段 | 怎么填 |
| --- | --- |
| `title` | 必填，文章标题；使用英文双引号包围 |
| `date` | 必填，发布日期，格式 YYYY-MM-DD |
| `summary` | 建议填写，文章列表的简短介绍 |
| `tags` | 可选，用英文双引号和逗号列出标签 |
| `draft` | 必填，`true` 不进入网站；`false` 发布 |
| `lang` | 中文填 `zh-Hans`，英文填 `en` |

当前采用单行元数据格式，字段名使用上述固定英文名；文本用英文双引号，标签用 JSON 数组。正文放在第二条 `---` 之后。

`draft` 只控制是否进入网站。当前仓库是公开仓库，提交过的 Markdown 源文件和历史记录仍然公开；尚不适合公开的草稿先写在本地。

## 正文支持什么

- 二级及以下标题：`## 标题`、`### 小标题`。
- 加粗、斜体、引用、编号列表、项目列表。
- Markdown 表格和围栏代码块。
- 链接、图片和普通文本网址。

正文标题从二级开始，文章标题已由顶部的 `title` 自动显示。原始 HTML 按文字显示；当前未接入数学公式排版和评论系统。

图片放在 `public/assets/blog/`，在文章中写 `![图片说明](../assets/blog/文件名.png)`；建议使用英文文件名。文章正文中的相对链接以 `/blog/` 为起点。

## 本地预览

首次运行：

```powershell
npm ci
npm run preview
```

打开 `http://127.0.0.1:4173/blog/`。修改后重新运行预览命令。草稿不会生成网页；想本地检查排版，可暂时把本地文件改为 `draft: false`，发布前再确定是否提交。

发布前检查：

```powershell
npm run check
```

文件名以 `_` 开头的模板始终被忽略；正常文章按日期倒序排列。将已发布文章改回草稿并重新发布后，网站会移除其页面，公开仓库历史仍保留原始提交。
