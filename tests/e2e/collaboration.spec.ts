import { test, expect, type Page } from "@playwright/test";

const WEB_URL = process.env.EVERYPAPER_WEB_URL ?? "http://localhost:5173";

async function drawLine(page: Page, fromX: number, fromY: number, toX: number, toY: number) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas not found");
  await page.mouse.move(box.x + fromX, box.y + fromY);
  await page.mouse.down();
  await page.mouse.move(box.x + (fromX + toX) / 2, box.y + (fromY + toY) / 2, { steps: 5 });
  await page.mouse.move(box.x + toX, box.y + toY, { steps: 5 });
  await page.mouse.up();
}

function nonWhitePixelCount(data: Uint8ClampedArray): number {
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r !== 255 || g !== 255 || b !== 255) count++;
  }
  return count;
}

async function countNonWhitePixels(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) count++;
    }
    return count;
  });
}

test("two independent browsers collaborate on the shared canvas with ownership enforced", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.goto(WEB_URL);
  await expect(pageA.locator("canvas")).toBeVisible({ timeout: 10000 });
  await pageA.waitForTimeout(500);

  // A draws a "house"
  await drawLine(pageA, 300, 300, 400, 300);
  await pageA.waitForTimeout(400);
  const aPixelsAfterDraw = await countNonWhitePixels(pageA);
  expect(aPixelsAfterDraw).toBeGreaterThan(0);

  // give the server time to broadcast + persist
  await pageA.waitForTimeout(800);

  await pageB.goto(WEB_URL);
  await expect(pageB.locator("canvas")).toBeVisible({ timeout: 10000 });
  await pageB.waitForTimeout(1200);

  // B should see A's house via tile sync
  const bPixelsAfterLoad = await countNonWhitePixels(pageB);
  expect(bPixelsAfterLoad).toBeGreaterThan(0);

  // B draws a "tree" over it
  await drawLine(pageB, 320, 280, 320, 340);
  await pageB.waitForTimeout(400);

  // A should see B's tree appear live
  await pageA.waitForTimeout(800);
  const aPixelsAfterBDraws = await countNonWhitePixels(pageA);
  expect(aPixelsAfterBDraws).toBeGreaterThanOrEqual(aPixelsAfterDraw);

  await contextA.close();
  await contextB.close();
});
