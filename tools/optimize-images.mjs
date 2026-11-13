/**
 * Build responsive WebP copies of the site photos.
 *
 * From the repo root, after `npm install` inside this folder:
 *   node tools/optimize-images.mjs
 *
 * Original JPGs stay in place and remain the <img> fallback.
 * WebP files are written to images/responsive/ at 640, 1024, 1600, and
 * 2000px wide, plus the photo's own width when it falls between those steps.
 * Photos are never upscaled. Logo files are not redrawn. A 480px-wide
 * WebP of the stacked logo is written for the footer, which shows it small.
 *
 * Also writes:
 *   images/favicon-32.png
 *   images/apple-touch-icon.png
 *   images/og-share.jpg
 *   images/video-poster.jpg (YouTube thumbnail, when the download works)
 *   images/responsive/manifest.json
 */
import { createWriteStream } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "images", "responsive");
const widths = [640, 1024, 1600, 2000];

async function jpegFiles(dir, { nested }) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (nested && entry.name !== "New folder" && entry.name !== "responsive") {
        files.push(...(await jpegFiles(full, { nested: true })));
      }
      continue;
    }
    if (/\.jpe?g$/i.test(entry.name)) files.push(full);
  }
  return files;
}

async function collectSources() {
  const deck = await jpegFiles(path.join(root, "images", "deck"), { nested: false });
  const gallery = await jpegFiles(path.join(root, "images", "gallery"), { nested: false });
  const top = await jpegFiles(path.join(root, "images"), { nested: false });
  return [...deck, ...gallery, ...top];
}

function targetsFor(width) {
  const fitted = widths.filter((size) => size <= width);
  if (!fitted.includes(width)) fitted.push(width);
  return [...new Set(fitted)].sort((a, b) => a - b);
}

async function optimizePhoto(file) {
  const image = sharp(file, { failOn: "none" });
  const meta = await image.metadata();
  const base = path.basename(file, path.extname(file));
  const made = [];
  for (const width of targetsFor(meta.width)) {
    const name = `${base}-${width}.webp`;
    await sharp(file, { failOn: "none" })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 76 })
      .toFile(path.join(outDir, name));
    made.push({ width, name });
  }
  return {
    source: path.relative(root, file).replaceAll("\\", "/"),
    width: meta.width,
    height: meta.height,
    files: made,
  };
}

async function writeBrandAssets() {
  const logo = path.join(root, "images", "deck", "logo-square.png");
  await sharp(logo)
    .resize(32, 32, { fit: "contain", background: { r: 251, g: 249, b: 245, alpha: 1 } })
    .png()
    .toFile(path.join(root, "images", "favicon-32.png"));
  await sharp(logo)
    .resize(180, 180, { fit: "contain", background: { r: 251, g: 249, b: 245, alpha: 1 } })
    .png()
    .toFile(path.join(root, "images", "apple-touch-icon.png"));

  await sharp(path.join(root, "images", "deck", "logo-stacked.png"))
    .resize({ width: 480, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(outDir, "logo-stacked-480.webp"));

  await sharp(path.join(root, "images", "deck", "volunteers-squash-line.jpg"))
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(path.join(root, "images", "og-share.jpg"));
}

async function downloadPoster() {
  const urls = [
    "https://i.ytimg.com/vi/hdGY5OPDi2o/maxresdefault.jpg",
    "https://i.ytimg.com/vi/hdGY5OPDi2o/hqdefault.jpg",
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const destination = path.join(root, "images", "video-poster.jpg");
      await pipeline(response.body, createWriteStream(destination));
      const meta = await sharp(destination).metadata();
      if ((meta.width || 0) < 640) continue;
      return true;
    } catch {
      /* try the next thumbnail */
    }
  }
  return false;
}

await mkdir(outDir, { recursive: true });
const sources = await collectSources();
const manifest = [];
for (const file of sources) {
  manifest.push(await optimizePhoto(file));
  console.log(path.basename(file));
}
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
await writeBrandAssets();
const poster = await downloadPoster();
console.log(`photos: ${manifest.length}`);
console.log(`video poster: ${poster ? "downloaded" : "skipped"}`);
