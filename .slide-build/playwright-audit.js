async page => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload({ waitUntil: "networkidle" });
  await page.addStyleTag({
    content: ".slide { transition: none !important; animation: none !important; }",
  });
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map(img =>
        img.complete
          ? Promise.resolve()
          : new Promise(resolve => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            })
      )
    );
  });

  const count = await page.locator(".slide").count();
  const issues = [];

  for (let index = 0; index < count; index += 1) {
    await page.evaluate(next => {
      location.hash = `#${next + 1}`;
    }, index);
    await page.waitForTimeout(20);

    const result = await page.locator(".slide.active").evaluate(slide => {
      const body = slide.querySelector(".slide-body");
      const title = slide.querySelector(".title");
      const images = [...slide.querySelectorAll("img")];
      const brokenImages = images
        .filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.getAttribute("src"));
      const remoteImages = images
        .map(img => img.getAttribute("src") || "")
        .filter(src => /^https?:/i.test(src));
      const overflow = body
        ? {
            x: body.scrollWidth > body.clientWidth + 2,
            y: body.scrollHeight > body.clientHeight + 2,
            scrollWidth: body.scrollWidth,
            clientWidth: body.clientWidth,
            scrollHeight: body.scrollHeight,
            clientHeight: body.clientHeight,
          }
        : null;
      const titleLines = title
        ? Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight))
        : 0;

      return {
        id: slide.id,
        brokenImages,
        remoteImages,
        overflow,
        titleLines,
      };
    });

    if (
      result.brokenImages.length ||
      result.remoteImages.length ||
      result.overflow?.x ||
      result.overflow?.y ||
      result.titleLines > 2
    ) {
      issues.push(result);
    }

    await page.screenshot({
      path: `output/playwright/slides/slide-${String(index + 1).padStart(2, "0")}.png`,
    });
  }

  return { count, issues };
}
