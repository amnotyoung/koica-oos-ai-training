#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [inputArg = "koica-oos-ai-data-training.html", outputArg = "_site/index.html"] =
  process.argv.slice(2);
const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg);
const source = readFileSync(inputPath, "utf8");

const shellPattern = /class="([^"]*\blocal-asset-shell\b[^"]*)"/g;
const shellCount = [...source.matchAll(shellPattern)].length;

if (shellCount === 0) {
  throw new Error("공개 대체 화면으로 전환할 local-asset-shell을 찾지 못했습니다.");
}

let html = source.replace(shellPattern, (_match, classes) => {
  const normalized = classes.trim();
  return /\basset-missing\b/.test(normalized)
    ? `class="${normalized}"`
    : `class="${normalized} asset-missing"`;
});

html = html.replace(/<img\b[^>]*\bdata-local-asset\b[^>]*>/g, (tag) =>
  tag.replace(/\s+src="[^"]*"/, ""),
);
html = html.replace(/<video\b[^>]*\bdata-local-asset\b[^>]*>/g, (tag) =>
  tag.replace(/\s+poster="[^"]*"/, ""),
);
html = html.replace(/<source\b[^>]*\bsrc="assets\/[^"]+"[^>]*>/g, (tag) =>
  tag.replace(/\s+src="[^"]*"/, ""),
);
html = html.replace("<html lang=\"ko\">", "<html lang=\"ko\" data-public-build=\"github-pages\">");

const markedShellCount = [
  ...html.matchAll(/class="[^"]*\blocal-asset-shell\b[^"]*\basset-missing\b[^"]*"/g),
].length;
const unresolvedMedia =
  /<(?:img|source)\b[^>]*\bsrc="assets\/(?:video|diagrams|memes)\//.test(html) ||
  /<video\b[^>]*\bposter="assets\/video\//.test(html);

if (markedShellCount !== shellCount) {
  throw new Error(`대체 화면 표시 수가 맞지 않습니다: ${markedShellCount}/${shellCount}`);
}
if (unresolvedMedia) {
  throw new Error("공개 HTML에 내부 전용 미디어 요청 경로가 남아 있습니다.");
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html);
console.log(`공개 발표자료 생성 완료: ${shellCount}개 내부 자산을 대체 화면으로 전환했습니다.`);
