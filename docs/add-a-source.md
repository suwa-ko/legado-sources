# 新增 / 更新书源

这个仓库的设计就是给后来源准备的：**一个站点一个文件，根目录平铺**，不需要改代码、不需要装依赖。

## 一、仓库约定

```
*.json（根目录）      每个文件 = 一个站点的书源数组，文件名即站点标识（如 bilinovel.json）
all.json              由 tools/build.mjs 生成的汇总，供"一次导入全部"
docs/*.json           放模板等，不会被合并
tools/build.mjs       合并 + 校验脚本
```

硬性要求（不满足会导致阅读导入失败）：

1. 文件顶层必须是**数组** `[ {...} ]`，即使只有一个书源（`all.json` 同理）；
2. 编码 UTF-8、**无 BOM**、合法 JSON（不能有注释、不能有尾逗号）；
3. 每个书源的 `bookSourceUrl` 全局**唯一**（重复会在阅读里互相覆盖），推荐写站点根地址、不带结尾 `/`；
4. `bookSourceName` 非空，便于识别。

## 二、加一个书源（5 分钟流程）

```bash
cd legado-sources
cp docs/book-source-template.json mysite.json   # 文件名 = 站点标识
# 改 mysite.json：bookSourceUrl / bookSourceName + 四组规则
node tools/build.mjs                            # 会校验并重新生成 all.json
git add -A && git commit -m "add mysite source" && git push
```

`node tools/build.mjs` 会打印每个文件的书源数量，并报出：

- JSON 解析失败 / 顶层不是数组
- 缺 `bookSourceName`、`bookSourceUrl`
- `bookSourceUrl` 重复

有错误时退出码为 1（可以直接接进 CI 或 pre-commit）。

## 三、规则怎么写（速查）

| 需求 | 写法 |
|---|---|
| CSS 选择器取文本 | `.book-title@text` |
| 取属性 | `a@href`、`img@data-src` |
| 取富文本（正文） | `#content@html` |
| 只取自身文本节点（去掉子元素文本） | `.book-author@ownText` |
| 取第一个非空（多套模板兼容） | `img@data-src‖img@src`（`‖` = 规则里的 `||`） |
| 合并多个规则的结果 | `规则A&&规则B` |
| 正则替换 / 清洗 | `rule##正则##替换`（正则里可用 `$1`；替换为空即删除） |
| JS 兜底 | `@js:...`，可用变量 `result`（当前内容）、`baseUrl`、`java`、`cookie`、`chapter`、`title` |
| URL 里代入参数 | `https://x.com/search?q={{key}}&page={{page}}` |
| POST 搜索 | `https://x.com/search,{"method":"POST","body":"kw={{key}}","charset":"utf-8"}` |
| 需要执行站点 JS（WebView） | URL 后加 `,{"webView":true}` |
| 请求头 | 书源 `header` 字段写 JSON 字符串，如 `{"User-Agent":"..."}` |

注意事项：

- `@js:` **必须放在规则最后**，占满该字段；它返回什么，规则结果就是什么；
- `searchUrl`（以及任何 URL 字段）可以整段写成 JS：返回值字符串会当作 `url` 或 `url,{选项}` 使用——需要先握手拿 Cookie 的站点就走这条路（见 `bilinovel.json`）；
- 目录里要混进"卷名"：`chapterList` 同时选中卷标题和章节节点，用 `isVolume` 规则把它们区分开（非空值为真，阅读会把它当卷名、不请求正文）；
- 多页正文：`nextContentUrl` 返回下一页地址，返回空即停止；注意别把"下一章"当成下一页（参考 `bilinovel.json` 里按 chapterid 判定的 JS）；
- 站点限流：`concurrentRate` 写成 `"1/1500"`（每 1.5 秒 1 次）比较安全；站点返回"200 + 空响应"通常就是被限流了。

## 四、调试

阅读 App → 书源管理 → 选中书源 → **调试**，按 搜索 → 详情 → 目录 → 正文 顺序逐个测，每步都能看到"请求 URL / 响应 / 解析结果"，比盲改规则快得多。

排查顺序建议：

1. 搜索 0 条 → 先看请求 URL 对不对，再看是不是被反爬（空响应）；
2. 详情字段空 → 拿调试里的响应 HTML，用浏览器开发者工具核对选择器；
3. 目录章节数为 0 或只有几章 → 检查 `chapterList` 是否命中了正确的列表容器，以及是否有分页 `nextTocUrl`；
4. 正文只有一段 → 多半是多页没接上（`nextContentUrl`）或站点给的是截断内容。

## 五、更新已有书源

改对应文件 → `node tools/build.mjs` → commit + push。阅读端需要重新「网络导入」一次相同 URL 才会覆盖（`bookSourceUrl` 相同即覆盖）。jsDelivr 有缓存，必要时用 `https://purge.jsdelivr.net/gh/suwa-ko/legado-sources@main/all.json` 刷新。
