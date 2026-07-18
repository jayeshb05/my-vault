const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Creates a PNG with a rounded-rect background + filled shield icon
function createVaultIcon(size) {
  const width = size;
  const height = size;

  // Colors — dark teal background, white shield
  const bgR = 0, bgG = 128, bgB = 105; // #008069 vault green
  const fgR = 255, fgG = 255, fgB = 255;

  const rawData = [];

  const cornerRadius = size * 0.22;
  const cx = width / 2;
  const cy = height / 2;

  // Shield path params (scaled to icon size)
  const shieldW = size * 0.44;
  const shieldH = size * 0.50;
  const shieldX = cx - shieldW / 2;
  const shieldY = cy - shieldH * 0.52;

  function inRoundedRect(x, y) {
    const r = cornerRadius;
    const x0 = r, x1 = width - r;
    const y0 = r, y1 = height - r;
    if (x >= x0 && x <= x1 && y >= 0 && y <= height) return true;
    if (y >= y0 && y <= y1 && x >= 0 && x <= width) return true;
    const corners = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
    for (const [cx2, cy2] of corners) {
      const dx = x - cx2, dy = y - cy2;
      if (dx * dx + dy * dy <= r * r) return true;
    }
    return false;
  }

  function inShield(px, py) {
    // Normalise to 0-1 within shield bounding box
    const nx = (px - shieldX) / shieldW;
    const ny = (py - shieldY) / shieldH;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return false;

    // Shield shape: top arc + bottom point
    // Left and right edges curve inward slightly in upper half
    const topArc = 0.18; // rounded top
    if (ny < topArc) {
      // Top rounded corners
      const arcCX = nx < 0.5 ? topArc : 1 - topArc;
      const arcCY = topArc;
      const dx = nx - arcCX, dy = ny - arcCY;
      if (nx < topArc && dx * dx + dy * dy > topArc * topArc) return false;
      if (nx > 1 - topArc && dx * dx + dy * dy > topArc * topArc) return false;
    }

    // Bottom point
    if (ny > 0.62) {
      const tipProgress = (ny - 0.62) / 0.38;
      const halfW = 0.5 * (1 - tipProgress);
      if (nx < 0.5 - halfW || nx > 0.5 + halfW) return false;
    }

    return true;
  }

  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      const inBg = inRoundedRect(x, y);
      const inFg = inShield(x, y);

      if (inFg && inBg) {
        rawData.push(fgR, fgG, fgB, 255);
      } else if (inBg) {
        rawData.push(bgR, bgG, bgB, 255);
      } else {
        rawData.push(0, 0, 0, 0);
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawData));

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
    return Buffer.concat([len, typeB, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const iconsDir = path.join(__dirname, "..", "public", "icons");
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const customImagePath = path.join(iconsDir, "image.png");

if (fs.existsSync(customImagePath)) {
  console.log("Found custom image.png! Using it as the app icon...");
  fs.copyFileSync(customImagePath, path.join(iconsDir, "icon-192.png"));
  fs.copyFileSync(customImagePath, path.join(iconsDir, "icon-512.png"));
  console.log("Custom icons successfully applied.");
} else {
  fs.writeFileSync(path.join(iconsDir, "icon-192.png"), createVaultIcon(192));
  fs.writeFileSync(path.join(iconsDir, "icon-512.png"), createVaultIcon(512));
  console.log("Default teal icons generated in public/icons/");
}
