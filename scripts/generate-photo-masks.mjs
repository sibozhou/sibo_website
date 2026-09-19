// Deterministic alpha dithering breaks up quantization bands without blurring the photo.
// Run with Node to regenerate the three responsive masks.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const directory = new URL("../app/masks/", import.meta.url);
mkdirSync(directory, { recursive: true });
let seed = 1917;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

function curve(points, x) {
  if (x <= points[0][0]) return points[0][1];
  if (x >= points.at(-1)[0]) return points.at(-1)[1];
  const h = points.slice(1).map((p, i) => p[0] - points[i][0]);
  const slopes = h.map((width, i) => (points[i + 1][1] - points[i][1]) / width);
  const tangents = points.map((_, i) => {
    if (!i || i === points.length - 1 || slopes[i - 1] * slopes[i] <= 0) return 0;
    const a = 2 * h[i] + h[i - 1], b = h[i] + 2 * h[i - 1];
    return (a + b) / (a / slopes[i - 1] + b / slopes[i]);
  });
  const i = points.findIndex((p) => p[0] > x) - 1;
  const t = (x - points[i][0]) / h[i];
  return (2*t**3 - 3*t**2 + 1)*points[i][1] + (t**3 - 2*t**2 + t)*h[i]*tangents[i]
    + (-2*t**3 + 3*t**2)*points[i + 1][1] + (t**3 - t**2)*h[i]*tangents[i + 1];
}

function chunk(type, data) {
  const bytes = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  bytes.copy(result, 4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
  return result;
}

for (const [name, vertical, points] of [
  ["desktop", false, [[0,0],[12,.06],[24,.2],[36,.4],[44,.65],[50,.85],[54,.96],[56,1]]],
  ["tablet", false, [[0,0],[6,.15],[14,.5],[22,.85],[30,1]]],
  ["mobile", true, [[0,0],[12,1],[75,1],[100,0]]],
]) {
  // Diagonal assets scale uniformly by their width in CSS, preserving a true
  // 45-degree direction even when the photo's responsive aspect ratio changes.
  const width = 1536, height = vertical ? 1024 : 4096;
  const alphas = Array.from({ length: vertical ? height : width + height - 1 }, (_, i) =>
    curve(points, 100 * i / ((vertical ? height : width) - 1)));
  const leftFeather = Array.from({ length: width }, (_, x) => {
    const t = Math.min(1, x / ((width - 1) * .12));
    return t ** 3 * (t * (6 * t - 15) + 10);
  });
  // Grayscale + alpha PNG, with spatially distributed sub-percent alpha noise.
  const pixels = Buffer.alloc(height * (width * 2 + 1));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // The principal fade follows x+y (CSS 135deg), beginning at the upper-left.
      // A narrow left-edge feather prevents a visible rectangular seam below it.
      const alpha = vertical ? alphas[y] : alphas[x + y] * leftFeather[x];
      const noise = alpha > 0 && alpha < 1 ? (random() - random()) * 2 : 0;
      pixels[y * (width * 2 + 1) + 1 + x * 2 + 1] = Math.max(0, Math.min(255, Math.round(alpha * 255 + noise)));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 4;
  writeFileSync(new URL(`photo-${name}.png`, directory), Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]));
}
