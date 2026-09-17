import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// Keep font downloads limited to the Chinese glyphs used by the shared pages.
const root = new URL("../", import.meta.url);
const source = ["app/home-page.tsx", "app/research-page.tsx", "app/site-frame.tsx", "app/languages.ts"]
  .map((path) => readFileSync(new URL(path, root), "utf8")).join("");
const text = [...new Set(source.match(/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/g))].sort().join("");

for (const [family, weight, filename] of [
  ["Noto Sans SC", 400, "noto-sans-sc-regular-zh.ttf"],
  ["Noto Sans SC", 500, "noto-sans-sc-medium-zh.ttf"],
  ["Noto Serif SC", 400, "noto-serif-sc-regular-zh.ttf"],
  ["Noto Sans TC", 400, "noto-sans-tc-regular-zh.ttf"],
  ["Noto Sans TC", 500, "noto-sans-tc-medium-zh.ttf"],
  ["Noto Serif TC", 400, "noto-serif-tc-regular-zh.ttf"],
]) {
  const cssUrl = new URL("https://fonts.googleapis.com/css2");
  cssUrl.search = new URLSearchParams({ family: `${family}:wght@${weight}`, text, display: "swap" }).toString();
  const css = execFileSync("curl", ["-fsS", "--max-time", "30", cssUrl.href], { encoding: "utf8" });
  const fontUrl = css.match(/src: url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\) format\('truetype'\)/)?.[1];
  if (!fontUrl) throw new Error(`Missing TrueType font for ${family} ${weight}`);
  execFileSync("curl", ["-fsS", "--max-time", "30", fontUrl, "--output", new URL(`app/fonts/${filename}`, root).pathname]);
  console.log(`Updated ${filename} (${text.length} glyphs requested)`);
}
