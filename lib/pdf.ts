import fs from "fs";
import puppeteer, { Browser } from "puppeteer-core";

/**
 * Local Chrome/Edge locations tried during development. On Vercel we use the
 * bundled serverless Chromium instead.
 */
const LOCAL_CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean) as string[];

const isServerless = () =>
  !!process.env.AWS_LAMBDA_FUNCTION_VERSION || !!process.env.VERCEL;

async function launchBrowser(): Promise<Browser> {
  if (isServerless()) {
    // Typed loosely: the serverless build exposes a slightly different shape
    // across versions, and it is only ever loaded on the server.
    const chromium: any = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const executablePath = LOCAL_CHROME_CANDIDATES.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

  if (!executablePath) {
    throw new Error(
      "No Chrome found for PDF generation. Install Chrome or set CHROME_PATH.",
    );
  }

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

/**
 * Renders a complete HTML document to a PDF buffer.
 * `printBackground` is on so the designer's colours survive.
 */
export async function htmlToPdf(
  html: string,
  opts: { widthPx?: number; heightPx?: number } = {},
): Promise<Buffer> {
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    // "load" waits for images (logos, QR data URIs) without the extra idle wait
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });

    // Match the designer canvas exactly rather than guessing a paper size
    const width = opts.widthPx ? `${opts.widthPx}px` : "794px";
    const height = opts.heightPx ? `${opts.heightPx}px` : "1123px";

    const pdf = await page.pdf({
      width,
      height,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: false,
    });

    return Buffer.from(pdf);
  } finally {
    await browser?.close().catch(() => {});
  }
}
