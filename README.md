# Little Nook · 个人成长空间

一个奶油色、轻手绘感的个人网站。使用原生 HTML / CSS / JavaScript 构建，没有数据库、没有传统后台服务器，也不需要购买云主机。

现在已接入 **Pages CMS**：内容保存在 GitHub 仓库的 `content/*.json`，你可以在网页上登录后台修改文字和图片，保存后自动提交到 GitHub，并触发静态网站重新部署。

网站里的「包子猫」图片来自你提供的素材，已做透明底裁切并本地化到 `assets/img/cat/`；原图保存在 `assets/img/cat/source/`。

---

## 1. 整体架构

```text
你在 Pages CMS 后台编辑
        ↓
保存 → 自动提交内容到 GitHub 仓库
        ↓
GitHub Pages / 其他静态托管自动部署
        ↓
访客打开公开网站
```

- 不需要服务器；
- 不需要自己配置 OAuth；
- 不需要数据库；
- 公开网站没有登录入口，后台是独立的 Pages CMS 网站（<https://app.pagescms.org>），不是网站里的 `/admin` 页面；
- 图片也保存在 GitHub 仓库里。

---

## 2. 上线前需要准备的账号

只需要两个免费账号：

1. **GitHub 账号**：存放网站代码与内容。
2. **Pages CMS 账号**：直接用 GitHub 登录即可，不需要另外注册密码。  
   后台地址：<https://app.pagescms.org>

> GitHub Pages 对公开仓库免费。若仓库为私有，GitHub Pages 可能需要付费账户；个人公开网站通常直接使用 public 仓库即可。

---

## 3. 第一次上线

### 第一步：把文件上传到 GitHub

1. 登录 GitHub，新建一个仓库，例如 `little-nook`。
2. 将本项目里的所有文件上传到仓库根目录。
3. 确保仓库根目录能看到：
   - `index.html`
   - `.pages.yml`
   - `content/`
   - `assets/`

> 仓库可以是 public。这个网站本身完全公开，不放敏感信息。

### 第二步：开启 GitHub Pages

1. 打开仓库的 **Settings → Pages**。
2. **Source** 选择 **Deploy from a branch**。
3. 分支选择 `main`，目录选择 **/ (root)**。
4. 点击 Save。
5. 等待 1–3 分钟，访问 GitHub 提供的网址：
   `https://你的用户名.github.io/仓库名/`

网站会正常从 `content/*.json` 读取内容。

### 第三步：连接 Pages CMS

1. 打开 <https://app.pagescms.org>。
2. 使用 GitHub 登录。
3. 按提示安装 Pages CMS 的 GitHub App，授权你刚才创建的仓库。
4. 选择仓库，Pages CMS 会自动读取根目录的 `.pages.yml`。
5. 左侧会出现 7 个可编辑区域：
   - 站点与个人资料
   - 关于我
   - 学习成长
   - 阅读与收藏
   - 项目展示
   - 兴趣与灵感
   - 生活相册

之后每次修改，点击保存 / 提交，Pages CMS 会把改动写回 GitHub；GitHub Pages 收到新提交后会自动重新部署。

> GitHub Pages 的首次部署和后续更新可能有 1–3 分钟延迟，这是正常的。
>
> 仓库里还带了一个 GitHub Actions 工作流 `.github/workflows/sync-fallback.yml`。当 `content/*.json` 变化时，它会自动重新生成 `assets/js/data.js`，让“直接双击 index.html”的离线预览也保持最新。不需要手动运行。
>
> Pages CMS 使用说明：[pagescms.org/docs](https://pagescms.org/docs/)

---

## 4. 日常怎么更新网站

打开 <https://app.pagescms.org> → 选择仓库 → 点击左侧栏目 → 修改 → 保存。

可以修改的内容包括：

- 昵称、学校、专业、介绍、座右铭；
- 首页四个预览卡片；
- 关于我的字段、兴趣标签、爱好；
- 学习方向、未来计划和成长时间轴；
- 论文、书籍、文章、影视纪录片的标题、简介、封面和感想；
- 项目名称、介绍、用途、预览图和公开链接；
- 灵感墙的图片、引用、配色、文字卡片；
- 相册图片、标题、说明和分类；
- 图片上传。

### 图片上传

Pages CMS 的图片会保存到 `assets/img/`，图片字段会使用相对路径，例如：

```text
assets/img/your-photo.webp
```

上传建议：

- 使用 WebP / JPG / PNG；
- 单张照片建议长边 1200–2000px；
- 单张图片尽量控制在 500KB 以内；
- 不要上传身份证、住址、车票、学号等包含敏感信息的图片；
- 明星图片请确认你有权使用。

---

## 5. 内容文件在哪里

主要内容在：

```text
content/
├── site.json        # 站点信息、个人资料、首页预览
├── about.json       # 关于我
├── learning.json    # 学习成长
├── reading.json     # 阅读与收藏
├── projects.json    # 项目展示
├── interests.json   # 兴趣与灵感
└── gallery.json     # 生活相册
```

后台表单的结构由根目录的：

```text
.pages.yml
```

定义。如果以后想新增字段，需要同时修改 `.pages.yml` 和对应的 JSON 文件。

### 前端如何读取内容

- 通过 HTTP / HTTPS 打开网站时，`assets/js/main.js` 会读取 `content/*.json`。
- 直接双击打开 `index.html` 时，浏览器出于本地文件安全限制不能读取 JSON，会自动回退到 `assets/js/data.js` 里的离线副本。

因此：

- **线上网站**的最新内容以 `content/*.json` 为准；
- **双击本地预览**使用 `assets/js/data.js`；
- 仓库里的 GitHub Actions 会在 `content/*.json` 更新后自动同步 `data.js`；
- 如果还没有启用 Actions，也可以手动运行 `npm run sync` 或 `node scripts/sync-fallback.mjs`。

如果想在本地以“线上模式”预览 JSON 内容，运行：

```bash
python -m http.server 8000
```

然后访问 <http://127.0.0.1:8000/>。

---

## 6. 本地文件结构

```text
个人主页/
├── index.html
├── .pages.yml                  # Pages CMS 后台表单配置
├── .github/workflows/
│   └── sync-fallback.yml       # 自动同步离线回退数据
├── package.json                # 两个便利脚本，无第三方依赖
├── README.md
├── content/                    # ★ 线上内容源文件
│   ├── site.json
│   ├── about.json
│   ├── learning.json
│   ├── reading.json
│   ├── projects.json
│   ├── interests.json
│   └── gallery.json
├── scripts/
│   └── sync-fallback.mjs       # 生成离线回退数据
└── assets/
    ├── css/style.css
    ├── js/
    │   ├── main.js
    │   └── data.js             # 自动生成的离线回退数据
    └── img/
        ├── favicon.png
        ├── cat/                # 包子猫素材与原图
        ├── gallery/            # 相册图片（当前可为空）
        ├── reading/            # 阅读封面（当前可为空）
        └── projects/           # 项目预览（当前可为空）
```

---

## 7. 隐私与安全

- 公开网站没有登录、注册、评论或上传接口。
- 访客无法直接修改仓库内容。
- 只有你授权 GitHub 仓库访问权限的账号，才能通过 Pages CMS 修改内容。
- 页面不主动收集访问者信息。
- 不展示联系方式、学号、家庭住址等敏感资料。
- 外部链接会在新标签页打开。

> 请勿把 GitHub 密码、Token、私钥等信息写进仓库。

---

## 8. 常见问题

**Pages CMS 中看不到配置？**

确认 `.pages.yml` 位于仓库**根目录**，而不是 `assets/` 或 `content/` 里面。Pages CMS 读取的是你当前选择的分支。

**保存后网站没有变化？**

1. 先等 1–3 分钟，GitHub Pages 需要重新构建。
2. 打开仓库的 **Actions** 或 **Settings → Pages** 查看部署状态。
3. 强制刷新浏览器（Windows：`Ctrl + F5`）。
4. 检查是否编辑了正确的仓库和分支。

**Pages CMS 看不到仓库？**

在 GitHub 的 Installed GitHub Apps 页面里检查 Pages CMS 是否已授权该仓库；只选择这一个仓库即可。

**图片不显示？**

- 图片必须上传到仓库中的 `assets/img/` 下；
- 推荐使用相对路径，例如 `assets/img/photo.webp`；
- 页面已经兼容 CMS 写出的 `/assets/...` 路径，但尽量不要手动写 `C:\...` 这样的本地路径；
- 图片文件名建议只用英文、数字和连字符。

---

## 9. 还需要你补充的内容

- [ ] 昵称、学校、专业
- [ ] 首页一句话介绍与 About Me 长介绍
- [ ] 个人座右铭
- [ ] 真实兴趣领域与日常爱好
- [ ] 学习进度、未来方向、成长时间轴
- [ ] 8 条示例阅读收藏替换成你的真实清单与读后感
- [ ] 项目（当前为空，结构已经搭好）
- [ ] 灵感墙的示例卡片与文案
- [ ] 生活照片、喜欢的明星与收藏图片
- [ ] 网站名 `Little Nook`（如想换名字，在 Pages CMS 的「站点与个人资料」里修改）

---

## 10. 已检查的内容

在本地浏览器尺寸 **1440 / 1024 / 768 / 390 / 320px** 下进行了截图检查，并验证了：

- 通过 HTTP 访问时读取 `content/*.json`；
- 直接双击 `index.html` 时读取离线 `data.js`；
- 所有导航链接都有对应区块；
- 页面无横向溢出；
- 图片资源可以加载；
- 阅读卡片可以打开 / 关闭详情弹窗；
- 相册分类筛选正常；
- 「喜欢的明星」空分类显示正常；
- 相册图片可以打开 / 关闭灯箱；
- 移动端菜单可以打开并支持 Esc 关闭；
- 没有空链接 `#`；
- 交互后没有 JavaScript 运行时错误。

Pages CMS 后台本身需要在你的 GitHub 仓库连接后使用；`.pages.yml` 已通过 YAML 与字段结构检查。Pages CMS 的编辑界面由它托管，不需要你部署。
