#!/usr/bin/env node
/**
 * 把所有书源文件合并成 all.json（供"一次导入全部"用）。
 *
 * 约定：仓库根目录下每个 *.json 文件 = 一个站点的书源数组（1 个或多个书源），
 * 文件名就是站点标识，例如 bilinovel.json、qidian.json。
 *
 * 用法：node tools/build.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "all.json";
const IGNORE = new Set([OUT, "package.json", "package-lock.json", "tsconfig.json", "jsconfig.json"]);

const files = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith(".json") && !IGNORE.has(f))
  .sort((a, b) => a.localeCompare(b, "en"));

const all = [];
const seen = new Map();
const problems = [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(ROOT, file), "utf8").replace(/^\uFEFF/, "");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    problems.push(`${file}: JSON 解析失败 -> ${e.message}`);
    continue;
  }
  if (!Array.isArray(data)) {
    problems.push(`${file}: 顶层必须是数组 []（阅读网络导入要求）`);
    continue;
  }
  for (const [i, src] of data.entries()) {
    const where = `${file}[${i}]`;
    if (!src || typeof src !== "object") {
      problems.push(`${where}: 不是对象`);
      continue;
    }
    const name = src.bookSourceName;
    const url = src.bookSourceUrl;
    if (!name) problems.push(`${where}: 缺少 bookSourceName`);
    if (!url) problems.push(`${where}: 缺少 bookSourceUrl`);
    if (url && seen.has(url)) problems.push(`${where}: bookSourceUrl 与 ${seen.get(url)} 重复（阅读里会互相覆盖）`);
    else if (url) seen.set(url, where);
    all.push(src);
  }
  console.log(`${file.padEnd(28)} ${String(data.length).padStart(2)} 个书源  ${data.map((s) => s.bookSourceName).join("、")}`);
}

if (problems.length) {
  console.error("\n发现问题：");
  for (const p of problems) console.error("  ✗ " + p);
  process.exitCode = 1;
}

fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(all, null, 2) + "\n", "utf8");
console.log(`\n=> ${OUT}: ${all.length} 个书源，${fs.statSync(path.join(ROOT, OUT)).size} 字节`);
