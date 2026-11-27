/**
 * 把 content/*.json 合并成 assets/js/data.js，供直接双击 index.html 时离线使用。
 * 线上访问会优先读取 content/*.json，不依赖这个文件。
 *
 * 用法：node scripts/sync-fallback.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "content");

const read = (name) => JSON.parse(fs.readFileSync(path.join(contentDir, `${name}.json`), "utf8"));

const site = read("site");
const reading = read("reading");
const projects = read("projects");
const gallery = read("gallery");

const data = {
  site: site.site,
  profile: site.profile,
  previews: site.previews,
  about: read("about"),
  learning: read("learning"),
  readingCategories: reading.readingCategories,
  readings: reading.readings,
  projects: projects.projects,
  projectsIntro: projects.projectsIntro,
  interests: read("interests"),
  galleryCategories: gallery.galleryCategories,
  gallery: gallery.gallery,
  galleryEmpty: gallery.galleryEmpty,
};

const header = `/* =========================================================
   Little Nook · 离线回退数据
   ---------------------------------------------------------
   这个文件由 scripts/sync-fallback.mjs 自动生成。
   线上内容以 content/*.json 为准；不要直接在这里做大改，
   否则 CMS 更新后这里会与线上内容不一致。
   ========================================================= */
`;

fs.writeFileSync(
  path.join(root, "assets", "js", "data.js"),
  `${header}window.SITE_DATA = ${JSON.stringify(data, null, 2)};\n`,
  "utf8"
);

console.log("已从 content/*.json 生成 assets/js/data.js");
