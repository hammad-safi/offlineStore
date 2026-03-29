const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const chunk = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(chunk), 0);
  return Buffer.concat([len, chunk, crc]);
}

function createPng(width, height, pixels) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    const rowStart = y * (width * 4 + 1) + 1;
    pixels.copy(raw, rowStart, y * width * 4, y * width * 4 + width * 4);
  }

  const idat = zlib.deflateSync(raw);
  const png = Buffer.concat([
    header,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  return png;
}

function makeIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const bg = [0x25, 0x63, 0xeb, 0xff];
  const fg = [0xff, 0xff, 0xff, 0xff];
  const r = size * 0.35;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inside = dist < r;
      const color = inside ? fg : bg;
      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
      pixels[idx + 3] = color[3];
    }
  }

  // Add a simple white "S" shape using blocks
  const stroke = Math.max(2, Math.floor(size * 0.08));
  const left = Math.floor(size * 0.32);
  const right = Math.floor(size * 0.68);
  const top = Math.floor(size * 0.28);
  const middle = Math.floor(size * 0.5);
  const bottom = Math.floor(size * 0.72);

  for (let y = top; y <= middle; y++) {
    for (let x = left; x <= right; x++) {
      if (y < top + stroke || x < left + stroke || x > right - stroke || y > middle - stroke) continue;
      const idx = (y * size + x) * 4;
      pixels[idx] = fg[0];
      pixels[idx + 1] = fg[1];
      pixels[idx + 2] = fg[2];
      pixels[idx + 3] = fg[3];
    }
  }

  for (let y = middle; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (y > bottom - stroke || x < left + stroke || x > right - stroke || y < middle + stroke) continue;
      const idx = (y * size + x) * 4;
      pixels[idx] = fg[0];
      pixels[idx + 1] = fg[1];
      pixels[idx + 2] = fg[2];
      pixels[idx + 3] = fg[3];
    }
  }

  return pixels;
}

function writeIcon(size) {
  const pixels = makeIcon(size);
  const png = createPng(size, size, pixels);
  const dir = 'public/icons';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/icon-${size}x${size}.png`, png);
  console.log(`Generated ${dir}/icon-${size}x${size}.png`);
}

writeIcon(192);
writeIcon(512);
