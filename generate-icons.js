const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const outputDir = path.join(__dirname, "public", "icons");
const legacySvgPath = path.join(outputDir, "icon.svg");
const pinkSvgPath = path.join(outputDir, "sistercare-pink-v3.svg");
const maskableSvgPath = path.join(
  outputDir,
  "sistercare-pink-v3-maskable.svg",
);
const legacySizes = [72, 96, 128, 144, 152, 192, 384, 512];
const pinkSizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

async function generateIcons() {
  const legacySvg = fs.readFileSync(legacySvgPath);
  const pinkSvg = fs.readFileSync(pinkSvgPath);
  const maskableSvg = fs.readFileSync(maskableSvgPath);

  // Keep the old URLs pink for older installations while all current
  // metadata uses new filenames that force browser and OS icon refreshes.
  for (const size of legacySizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(legacySvg).resize(size, size).png().toFile(outputPath);
    console.log(`Generated: icon-${size}x${size}.png`);
  }

  for (const size of pinkSizes) {
    const outputPath = path.join(
      outputDir,
      `sistercare-pink-v3-${size}x${size}.png`,
    );
    await sharp(pinkSvg).resize(size, size).png().toFile(outputPath);
    console.log(`Generated: sistercare-pink-v3-${size}x${size}.png`);
  }

  for (const size of [192, 512]) {
    const outputPath = path.join(
      outputDir,
      `sistercare-pink-v3-maskable-${size}x${size}.png`,
    );
    await sharp(maskableSvg).resize(size, size).png().toFile(outputPath);
    console.log(`Generated: sistercare-pink-v3-maskable-${size}x${size}.png`);
  }

  await sharp(pinkSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, "public", "favicon.ico"));
  await sharp(pinkSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(outputDir, "sistercare-pink-v3-favicon.png"));
  console.log("Generated: favicon.ico and versioned pink favicon");

  console.log("\\nAll icons generated successfully!");
}

generateIcons().catch(console.error);
