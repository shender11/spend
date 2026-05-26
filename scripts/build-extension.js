import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const publicUrl = process.env.PUBLIC_URL || "https://your-service.onrender.com";
const token = process.env.EXTENSION_TOKEN || "change-me";
const syncFrom = process.env.ORBITA_SYNC_FROM || "2022-01-01";

await rm("dist-extension", { recursive: true, force: true });
await mkdir("dist-extension", { recursive: true });
await cp("extension", "dist-extension/extension", { recursive: true });

const contentPath = "dist-extension/extension/content.js";
const backgroundPath = "dist-extension/extension/background.js";
const manifestPath = "dist-extension/extension/manifest.json";
const content = await readFile(contentPath, "utf8");
await writeFile(contentPath, content
  .replace('const SYNC_FROM = "2022-01-01";', `const SYNC_FROM = ${JSON.stringify(syncFrom)};`));

const background = await readFile(backgroundPath, "utf8");
await writeFile(backgroundPath, background
  .replace("https://your-service.onrender.com/extension/orbita-sync", `${publicUrl.replace(/\/$/, "")}/extension/orbita-sync`)
  .replace('const EXTENSION_TOKEN = "change-me";', `const EXTENSION_TOKEN = ${JSON.stringify(token)};`));

const manifest = await readFile(manifestPath, "utf8");
await writeFile(manifestPath, manifest.replace("https://your-service.onrender.com/*", `${publicUrl.replace(/\/$/, "")}/*`));

console.log(`Extension copied to dist-extension/extension for ${publicUrl}`);
