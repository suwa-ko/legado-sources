# Legado 书源仓库

给「阅读 3.0（Legado）」用的书源集合，按站点分文件。每个文件都是**书源对象数组**，可以直接用 URL 网络导入。

| 文件 | 站点 | 说明 |
|---|---|---|
| [`bilinovel.json`](./bilinovel.json) | [哔哩轻小说](https://www.bilinovel.com/) | 搜索 / 发现（文库 14 分类 + 排行 + 完本）/ 详情 / 分卷目录 / 多页正文合并 |

---

## 一、导入到阅读

### 方式 A：网络导入（推荐，以后换书源只改仓库文件）

阅读 App → 我的 → 书源管理 → 右上角 `⋮` → **网络导入** → 粘贴下面任意一条（内容完全一致，只是走的线路不同）：

| 线路 | 地址 | 备注 |
|---|---|---|
| jsDelivr | `https://cdn.jsdelivr.net/gh/suwa-ko/legado-sources@main/bilinovel.json` | 国内一般可用，**推荐** |
| jsDelivr(Fastly) | `https://fastly.jsdelivr.net/gh/suwa-ko/legado-sources@main/bilinovel.json` | 备用线路 |
| GitHub raw | `https://raw.githubusercontent.com/suwa-ko/legado-sources/main/bilinovel.json` | 国内可能被墙 |
| gh 代理 | `https://ghproxy.net/https://raw.githubusercontent.com/suwa-ko/legado-sources/main/bilinovel.json` | raw 打不开时用 |

> 仓库必须是 **public**，私有仓库的 raw 地址需要 token，阅读拿不到。

### 方式 B：本地导入

下载 [`bilinovel.json`](./bilinovel.json)，在书源管理 → 本地导入里选择该文件。

### 方式 C：一键深链（手机上点开即唤起阅读）

在手机浏览器打开（或做成网页按钮）：

```
legado://import/bookSource?src=https%3A%2F%2Fraw.githubusercontent.com%2Fsuwa-ko%2Flegado-sources%2Fmain%2Fbilinovel.json
```

`src` 的值就是方式 A 的地址做 URL 编码。不同版本的阅读对深链支持略有差异，失败就用方式 A。

---

## 二、验证

导入后搜索 `无职转生`，应出现 2 条结果；打开《无职转生 ～到了异世界就拿出真本事～》，目录应为 **656 项**（36 卷 + 620 章）。

书源的实现细节、实测记录和已知限制见 [`bilinovel-notes.md`](./bilinovel-notes.md)，或直接看 JSON 里的 `bookSourceComment`：

- 站点搜索有 `search_guard` 反爬，书源用 `searchUrl` 内的 JS 自动完成三步握手，**必须开启「启用 Cookie」**；
- 站点对非浏览器客户端会截断正文（末尾 `（內容加載失敗…）`），书源已清掉该标记，但正文长度可能不全，详见 `bookSourceComment`。

---

## 三、更新与维护

书源改动后：

```bash
# 改完 bilinovel.json（务必保持 JSON 合法、顶层是数组）
git add .
git commit -m "update bilinovel source"
git push
```

- GitHub raw 有缓存，推送后一般 1~5 分钟生效；jsDelivr 缓存更久，可加 `@main` 之外的 tag 或访问
  `https://purge.jsdelivr.net/gh/<owner>/<repo>@main/bilinovel.json` 手动刷新。
- 书架里已导入的书源不会自动跟着仓库变，需要在书源管理里重新「网络导入」覆盖一次（同 `bookSourceUrl` 会覆盖）。

---

## 四、免责声明

本仓库**只包含解析规则**，不存储、不转载任何小说正文；所有内容版权归原站点与原作者所有。书源仅供个人学习与技术研究，请勿用于商业用途，并遵守目标站点的服务条款。站点改版或封禁导致失效属正常情况。

