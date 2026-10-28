# Yichen Long · 龙羿辰

个人学术主页：**https://yichen-long.github.io/**

采用参考主页的学术排版：头像与身份并列、蓝色标题、衬线字体、细分隔线、按类别展示论文。手机端自动切换布局。HTML 在构建时生成，阅读正文不依赖 JavaScript，也不加载外部字体或前端框架。

## 填写内容

- **修改网页实际内容：** 编辑 [content/profile.json](content/profile.json)。
- **写 Blog：** 查看 [BLOG_GUIDE.md](BLOG_GUIDE.md)，复制 [文章模板](content/posts/_template.md) 开始写作。
- **头像：** 放入 `public/assets/portrait.jpg`，设置 `portrait` 为 `assets/portrait.jpg`。
- **CV / Paper / Slides：** 放入 `public/files/`，链接写成 `files/文件名.pdf`。建议使用英文文件名。
- **样式：** 编辑 [public/assets/style.css](public/assets/style.css)。

网站支持 Biography、Research Interests、Conference Papers、Journal Papers、Preprints、Education、Experience、Teaching 和 Awards。空栏目及其导航会自动隐藏，填写条目后自动出现。论文按年份及 `order` 倒序；本人作者名由 `authorNames` 指定，自动加粗。

网页仅发布 `dist/` 中的生成文件及 `public/` 的资源。公开仓库中的源文件和提交历史均可见。

## 本地查看

需要 Node.js 22 或更高版本。首次运行先安装锁定的 Markdown 解析依赖：

```powershell
npm ci
npm run preview
```

打开终端显示的 `http://127.0.0.1:4173`。内容修改后，停止并重新运行预览命令即可生成新页面。

```powershell
npm run check
```

检查会重新生成网页，验证本地资源、章节跳转、空栏目隐藏和部署文件。

## 自动发布

本仓库使用 [.github/workflows/pages.yml](.github/workflows/pages.yml)。推送到 `main` 后，GitHub Actions 构建、检查并发布到 GitHub Pages。可在仓库的 Actions 标签页查看状态。

在 GitHub 网页中更新最简单：打开 `content/profile.json` → 点击编辑 → 保存提交。几分钟后访问个人主页查看变化。修改日期请同步填写到 `updated`。

本地更新可使用：

```powershell
git add content/profile.json public
git commit -m "Update academic profile"
git push
```

首次部署时，需要将仓库 Settings → Pages → Build and deployment → Source 设为 **GitHub Actions**。
