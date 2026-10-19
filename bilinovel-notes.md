# 哔哩轻小说 · 阅读 3.0 书源

依据 [https://www.bilinovel.com/](https://www.bilinovel.com/) 现网页面结构编写的 Legado（阅读 3.0）书源。

- 书源文件：[bilinovel.json](./bilinovel.json)
- 书源名：哔哩轻小说 ｜ 分组：轻小说 ｜ 类型：文本(0)
- 站点有三个等价域名：`www.bilinovel.com`、`www.bilinovel.net`、`www.linovelib.com`（同一个站点、同一套移动端模板）。

---

## 一、导入

阅读 App → 我的 → 书源管理 → 右上角 `⋮` → **本地导入**，选择 `bilinovel.json`；或者把 JSON 全文复制到「导入书源」的网络/文本入口。

导入后搜索 `无职转生` 验证，正常应出现 2 条结果。

> 保持书源里的 **「启用 Cookie」为开**，搜索依赖它（见下文）。

---

## 二、实测验证结果

用与书源完全相同的规则、并模拟 App 的请求流程（含 Cookie 握手）跑通：

| 环节 | 实测结果 |
|---|---|
| 搜索「无职转生」 | 2 条：`无职转生 ～到了异世界就拿出真本事～ / 理不尽な孙の手`、`无职转生 ～蛇足篇～` |
| 详情页 | 书名、作者、文库/标签、最后更新章节、更新时间、封面、字数（409.4万字）、简介、目录地址全部取到 |
| 目录 | 《无职转生》656 项 = **36 卷 + 620 章**，卷名与章节都能识别 |
| 正文 | 《无职转生》序章共 2 页（`/novel/2013/72034.html` + `72034_2.html`），自动合并、到下一章自动停 |
| 发现 | 文库 14 个分类、最新更新、完本、5 个排行榜，共 21 个入口，列表字段正常 |

---

## 三、三个关键实现

### 1. 搜索：站点有 `search_guard` 反爬，必须走 JS 握手

直接请求 `https://www.bilinovel.com/search.html?searchkey=xxx` 返回 **空响应**，`/search/xxx_1.html` 也一样。真正的流程是（浏览器加载搜索页时脚本自动完成）：

```
GET /search.html                        → 页面里加载 guard 的 css/js
GET /search.html?search_guard=css       → Set-Cookie: jieqiSearchCss=...
GET /search.html?search_guard=js        → 返回的 JS 里带 jieqiSearchJs=<token>
GET /search.html?search_guard=redeem    → Set-Cookie: jieqiSearchTicket=...
GET /search/{关键字}_{页码}.html         → 这时才有结果
```

因此书源的 `searchUrl` 是一段 JS（`@js:`）：用 `java.ajax()` 依次请求上面三步（Cookie 会自动进 CookieJar），把 JS 里返回的 `jieqiSearchJs` 用 `cookie.replaceCookie()` 写回，再拼出 `/search/{key}_{page}.html`。

需要注意的点：

- 必须 `enabledCookieJar: true`（书源里已开）。
- `searchUrl` 里的 base 域名优先取 `source.bookSourceUrl`，所以把 `bookSourceUrl` 换成 `www.bilinovel.net` 或 `www.linovelib.com` 后搜索也会跟着走。
- 如果使用的阅读版本没有 `cookie.replaceCookie`/`java.ajax`，搜索会直接返回 0 条；这种情况只能升级到较新的 3.0 版本。

### 2. 目录：分卷与章节混在同一个列表里

目录页（`/novel/{id}/catalog`）结构是：

```html
<div class="catalog-volume">
  <ul class="volume-chapters">
    <li class="chapter-bar chapter-li"><a href="/novel/7/vol_1612.html"><h3>卷名</h3></a></li>
    <li class="chapter-li jsChapter"><a href="/novel/7/126100.html"><span class="chapter-index">插图</span></a></li>
    ...
```

所以规则是：

```json
"chapterList": ".chapter-bar, .chapter-li.jsChapter",
"chapterName": "a@text",
"chapterUrl": "a@href",
"isVolume": "tag.h3@text"
```

`isVolume` 只对卷标题这个 `li` 取到非空值（里面有 `h3`），阅读会把它当卷名显示、不会去请求正文。

### 3. 正文多页：靠页面里的 `ReadParams.url_next`

长章节被站点切成 `129094.html`、`129094_2.html` …… 最后一页的 `url_next` 指向**下一章**，不能盲目跟。规则用 JS 判断：

```js
@js:var idM = String(result).match(/chapterid:'(\d+)'/);
var nxM = String(result).match(/url_next:'([^']+)'/);
var out = '';
if (idM && nxM) { var u = nxM[1]; if (u.indexOf('/' + idM[1] + '_') > -1) { out = u; } }
out
```

只有下一页仍是**同一 chapterid** 的 `_N` 页才会继续取，否则返回空 → 阅读停止翻页。

---

## 四、已知限制（重要）

### ① 正文可能被站点截断

站点对“不像浏览器”的客户端返回**截断后的正文**，末尾带：

```
……（內容加載失敗！請刷新或更換瀏覽器）
```

实测对照：

- 直接 HTTP 请求（PowerShell / Node / curl，带完整 Chrome 头、手机 UA、各种镜像域名）→ 同一章节每页都被截，约只剩 600~700 字/页；
- 同一 URL 用无头 Chrome 打开（浏览器执行了站点的 JS 校验）→ 正文完整、无该提示。

也就是说这是站点针对非浏览器客户端的返回策略，并非书源规则问题。书源里已经用 `replaceRegex` 把这一行标记清掉，避免出现在正文里。

**如果阅读时正文明显被截断**，可以按顺序试：

1. 换手机流量 / 换网络再试（有些出口 IP 不会被截）；
2. 把目录的章节链接规则临时改成 `a@href,{"webView":true}`（每章用内置浏览器加载，能过站点校验但**会明显变慢**，且该用法在部分版本才支持）；
3. 换 `bookSourceUrl` 到 `www.bilinovel.net` / `www.linovelib.com` 再试。

### ② 搜索对频率敏感

同一出口 IP 连续快速请求时，站点会返回 **HTTP 200 + 空响应**（不是报错）。书源里已设 `concurrentRate: "1/1500"`（约 1.5 秒 1 次）；如果搜索第 2 页起偶尔 0 条，重试即可。

### ③ 站点若改版需跟着改选择器

本版对应的模板特征：详情页 `#bookDetailWrapper`、目录 `#volumes`、正文 `#acontent`、搜索/发现列表 `ol.book-ol-normal > li.book-li`。站点换模板后这些会失效。

---

## 五、规则速查

| 字段 | 规则 |
|---|---|
| `searchUrl` | `@js:` 先做 guard 握手，再返回 `/search/{key}_{page}.html` |
| 搜索/发现列表 | `.book-ol.book-ol-normal>li.book-li, ol.jsBooks>li.book-li` |
| 书名 / 作者 | `.book-title@text` ／ `.book-author@ownText` |
| 封面 / 简介 | `.book-cover img@data-src‖src` ／ `.book-desc@text‖.book-intro@text` |
| 详情-书名/作者 | `#bookDetailWrapper h1.book-title@text` ／ `.book-rand-a .authorname@text` |
| 详情-简介/分类 | `#bookSummary content@text` ／ `.tag-small-group@text` |
| 详情-字数 | JS 正则取 `(\d+(\.\d+)?)万字` |
| 详情-目录URL | `#btnReadBook@href` |
| 目录 | `.chapter-bar, .chapter-li.jsChapter` + `isVolume: tag.h3@text` |
| 正文 | `#acontent@html` |
| 正文下一页 | `@js:` 取 `ReadParams.url_next`，限定同 chapterid 的 `_N` 页 |
| 发现 | 21 个入口：文库 14 分类 + 最新更新 + 完本 + 收藏/点击/推荐/鲜花/新书榜 |

（`‖` 表示阅读规则里的 `||`，即“取第一个非空结果”。）

---

## 六、调试建议

阅读 App → 书源管理 → 选中该书源 → **调试**：

1. 先测「搜索」，关键字用 `无职转生`；0 条时看调试日志里 `searchUrl` 返回的真实地址，以及 Cookie 里是否有 `jieqiSearchCss / jieqiSearchJs / jieqiSearchTicket` 三项；
2. 再测「详情」→「目录」→「正文」，正文页若出现 `（內容加載失敗`，就是上面第 ① 条。
