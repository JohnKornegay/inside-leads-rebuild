/**
 * Generates favicon.ico (16x16 + 32x32) for Inside Leads
 * Brand: dark bg #0d0d0d, accent #E8FF47
 * No external dependencies — pure Node.js Buffer manipulation
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Brand colors
const BG   = [0x0d, 0x0d, 0x0d, 0xff]; // #0d0d0d
const ACC  = [0x47, 0xff, 0xe8, 0xff]; // #E8FF47 in BGRA

// ── Pixel renderer ────────────────────────────────────────────────────────────
function isAccent16(r, c) {
  if (r <= 1  && c >= 2  && c <= 13) return true; // top bar
  if (r >= 2  && r <= 13 && c >= 6  && c <= 9)  return true; // stem
  if (r >= 14 && c >= 2  && c <= 13) return true; // bottom bar
  return false;
}

function isAccent32(r, c) {
  if (r <= 3  && c >= 4  && c <= 27) return true; // top bar
  if (r >= 4  && r <= 27 && c >= 12 && c <= 19) return true; // stem
  if (r >= 28 && c >= 4  && c <= 27) return true; // bottom bar
  return false;
}

// ── PNG builder (pure Node zlib) ─────────────────────────────────────────────
function buildPNG(size, pixelFn) {
  const width = size, height = size;
  // Raw scanlines: filter byte (0) + RGBA per pixel
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let r = 0; r < height; r++) {
    raw[r * (1 + width * 4)] = 0; // filter type None
    for (let c = 0; c < width; c++) {
      const [B, G, R, A] = pixelFn(r, c) ? ACC : BG;
      const off = r * (1 + width * 4) + 1 + c * 4;
      raw[off]   = R;
      raw[off+1] = G;
      raw[off+2] = B;
      raw[off+3] = A;
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  function crc32(buf) {
    let crc = 0xffffffff;
    for (const b of buf) {
      crc ^= b;
      for (let i = 0; i < 8; i++) crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcBuf = Buffer.concat([t, data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, t, data, c]);
  }

  const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 2;  // color type RGB (we'll use RGBA via alpha channel)
  ihdr[9]  = 6;  // RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── ICO builder ───────────────────────────────────────────────────────────────
function buildICO(entries) {
  // entries: [{size, png}]
  const count = entries.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + count * dirEntrySize;

  // Calculate offsets
  let offset = dirSize;
  for (const e of entries) e.offset = offset, offset += e.png.length;

  const buf = Buffer.alloc(offset);

  // ICONDIR header
  buf.writeUInt16LE(0,     0); // reserved
  buf.writeUInt16LE(1,     2); // type: 1 = ICO
  buf.writeUInt16LE(count, 4); // count

  // ICONDIRENTRY for each image
  entries.forEach((e, i) => {
    const base = 6 + i * 16;
    buf.writeUInt8(e.size === 256 ? 0 : e.size, base);     // width
    buf.writeUInt8(e.size === 256 ? 0 : e.size, base + 1); // height
    buf.writeUInt8(0,          base + 2); // color count
    buf.writeUInt8(0,          base + 3); // reserved
    buf.writeUInt16LE(1,       base + 4); // planes
    buf.writeUInt16LE(32,      base + 6); // bit count
    buf.writeUInt32LE(e.png.length, base + 8);  // size
    buf.writeUInt32LE(e.offset,     base + 12); // offset
  });

  // Copy PNG data
  for (const e of entries) e.png.copy(buf, e.offset);

  return buf;
}

// ── Build and write ───────────────────────────────────────────────────────────
const png16 = buildPNG(16, isAccent16);
const png32 = buildPNG(32, isAccent32);

const ico = buildICO([
  { size: 16, png: png16 },
  { size: 32, png: png32 },
]);

fs.writeFileSync(path.join(__dirname, 'favicon.ico'), ico);
console.log(`✓ favicon.ico written (${ico.length} bytes, 16x16 + 32x32)`);
