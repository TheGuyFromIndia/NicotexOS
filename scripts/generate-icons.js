import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height) {
  // Simple solid/gradient PNG generator
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    const t = y / height;
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Elegant deep dark navy to teal gradient
      const s = x / width;
      const r = Math.round(15 * (1 - t) + 6 * t * (1 - s) + 16 * s);
      const g = Math.round(23 * (1 - t) + 182 * t * (1 - s) + 185 * s);
      const b = Math.round(42 * (1 - t) + 212 * t * (1 - s) + 129 * s);
      
      // Central icon emblem circle
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width * 0.35;
      
      if (Math.abs(dist - radius) < width * 0.04) {
        // glowing ring
        rawData[pxOffset] = 6;
        rawData[pxOffset + 1] = 182;
        rawData[pxOffset + 2] = 212;
        rawData[pxOffset + 3] = 255;
      } else if (dist < radius * 0.5) {
        // center diamond
        const rotX = Math.abs(dx + dy) / 1.414;
        const rotY = Math.abs(dx - dy) / 1.414;
        if (rotX < width * 0.12 && rotY < width * 0.12) {
          rawData[pxOffset] = 56;
          rawData[pxOffset + 1] = 189;
          rawData[pxOffset + 2] = 248;
          rawData[pxOffset + 3] = 255;
        } else {
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
      }
    }
    return ~c >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve('./public/icons');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'icon-192x192.png'), createPNG(192, 192));
fs.writeFileSync(path.join(outDir, 'icon-512x512.png'), createPNG(512, 512));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPNG(180, 180));
fs.writeFileSync(path.resolve('./public/apple-touch-icon.png'), createPNG(180, 180));
fs.writeFileSync(path.resolve('./public/favicon.ico'), createPNG(32, 32));

console.log('Successfully generated crisp mobile PNG icons!');
