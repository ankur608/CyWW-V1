import fs from "fs";
import path from "path";
import zlib from "zlib";

function createPng(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(2, 9); // truecolor RGB
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Raw image data: filter byte 0 + RGB per pixel
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      // Draw a circular shield glow
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = width * 0.45;
      if (dist <= radius) {
        raw[pxOffset] = r;
        raw[pxOffset + 1] = g;
        raw[pxOffset + 2] = b;
      } else {
        raw[pxOffset] = 15;
        raw[pxOffset + 1] = 23;
        raw[pxOffset + 2] = 42;
      }
    }
  }

  const compressed = zlib.deflateSync(raw);

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, "ascii");
    data.copy(buf, 8);
    // CRC32 calculation
    let c = 0xffffffff;
    const typeAndData = buf.subarray(4, 8 + len);
    for (let i = 0; i < typeAndData.length; i++) {
      c ^= typeAndData[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    buf.writeInt32BE((c ^ 0xffffffff) | 0, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk("IHDR", ihdr);
  const idatChunk = makeChunk("IDAT", compressed);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const assetsDir = path.join(process.cwd(), "assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Emerald cyan shield color: RGB (16, 185, 129)
fs.writeFileSync(path.join(assetsDir, "icon16.png"), createPng(16, 16, 16, 185, 129));
fs.writeFileSync(path.join(assetsDir, "icon48.png"), createPng(48, 48, 16, 185, 129));
fs.writeFileSync(path.join(assetsDir, "icon128.png"), createPng(128, 128, 16, 185, 129));

console.log("CyWW icon assets generated successfully.");
