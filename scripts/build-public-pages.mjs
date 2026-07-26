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
const publicVideoShellCount = [...source.matchAll(shellPattern)].filter((match) =>
  /\bdemo-video-frame\b/.test(match[1]),
).length;
const fallbackShellCount = shellCount - publicVideoShellCount;

if (shellCount === 0) {
  throw new Error("공개 대체 화면으로 전환할 local-asset-shell을 찾지 못했습니다.");
}

let html = source.replace(shellPattern, (_match, classes) => {
  const normalized = classes.trim();
  if (/\bdemo-video-frame\b/.test(normalized)) {
    return `class="${normalized}"`;
  }
  return /\basset-missing\b/.test(normalized)
    ? `class="${normalized}"`
    : `class="${normalized} asset-missing"`;
});

html = html.replace(/<img\b[^>]*\bdata-local-asset\b[^>]*>/g, (tag) =>
  tag.replace(/\s+src="[^"]*"/, ""),
);
html = html.replace("<html lang=\"ko\">", "<html lang=\"ko\" data-public-build=\"github-pages\">");

const markedShellCount = [
  ...html.matchAll(/class="[^"]*\blocal-asset-shell\b[^"]*\basset-missing\b[^"]*"/g),
].length;
const unresolvedExcludedMedia =
  /<img\b[^>]*\bsrc="assets\/(?:diagrams|memes)\//.test(html);
const retainedVideoCount = [
  ...html.matchAll(/<source\b[^>]*\bsrc="assets\/video\/[^"]+-demo\.mp4"/g),
].length;
const directVideoLinkCount = [
  ...html.matchAll(
    /<a\b[^>]*\bclass="video-direct-link"[^>]*\bhref="assets\/video\/[^"]+-demo\.mp4"/g,
  ),
].length;

if (markedShellCount !== fallbackShellCount) {
  throw new Error(
    `대체 화면 표시 수가 맞지 않습니다: ${markedShellCount}/${fallbackShellCount}`,
  );
}
if (unresolvedExcludedMedia) {
  throw new Error("공개 HTML에 내부 전용 미디어 요청 경로가 남아 있습니다.");
}
if (retainedVideoCount !== publicVideoShellCount) {
  throw new Error(
    `공개 영상 수가 맞지 않습니다: ${retainedVideoCount}/${publicVideoShellCount}`,
  );
}
if (directVideoLinkCount !== publicVideoShellCount * 2) {
  throw new Error(
    `영상 직접 열기 링크 수가 맞지 않습니다: ${directVideoLinkCount}/${publicVideoShellCount * 2}`,
  );
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html);
console.log(
  `공개 발표자료 생성 완료: 영상 ${publicVideoShellCount}개 유지, ` +
    `내부 이미지 ${fallbackShellCount}개를 대체 화면으로 전환했습니다.`,
);
