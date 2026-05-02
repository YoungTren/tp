/**
 * Скачивает travel-фото с Unsplash в `public/images/travel-hero-background.jpg`.
 * Запуск на своей машине: `npm run download-hero`
 *
 * Фото: Luke Stackpoole / desert highway — unsplash.com/photos/photo-1469854523086-cc02fe5d8800
 * Лицензия Unsplash: https://unsplash.com/license
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(__dirname, "..", "public", "images", "travel-hero-background.jpg");
const url =
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2400&q=85";

const res = await fetch(url, { redirect: "follow" });
if (!res.ok) {
  console.error("HTTP", res.status, await res.text().catch(() => ""));
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, buf);
console.log("OK", dest, buf.length, "bytes");
