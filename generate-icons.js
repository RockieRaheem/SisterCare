const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const svgPath = path.join(__dirname, "public", "icons", "icon.svg");
const outputDir = path.join(__dirname, "public", "icons");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  const svg = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(outputPath);
    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Also create favicon
  await sharp(svg)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, "public", "favicon.ico"));
  console.log("Generated: favicon.ico");

  console.log("\\nAll icons generated successfully!");
}

generateIcons().catch(console.error);
