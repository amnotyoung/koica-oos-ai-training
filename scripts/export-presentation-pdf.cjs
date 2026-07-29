#!/usr/bin/env node

const { mkdir, stat } = require("node:fs/promises");
const { dirname, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const [inputArg = "_site/index.html", outputArg = "_site/koica-oos-ai-data-training.pdf"] =
  process.argv.slice(2);
const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg);

async function main() {
  await stat(inputPath);
  await mkdir(dirname(outputPath), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(inputPath).href, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: outputPath,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  } finally {
    await browser.close();
  }

  console.log(`발표자료 PDF 생성 완료: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
