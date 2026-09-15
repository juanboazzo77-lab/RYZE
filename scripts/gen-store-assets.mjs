import sharp from 'sharp';

const ICON_SRC = 'assets/icon.png';
const OUT_DIR = 'store-assets';

// 1) Play Store app icon: 512x512 PNG (32-bit, with alpha)
await sharp(ICON_SRC).resize(512, 512).png().toFile(`${OUT_DIR}/play-icon-512.png`);

// 2) Feature graphic: 1024x500, dark background + icon + wordmark. No alpha.
const iconBuf = await sharp(ICON_SRC).resize(280, 280).png().toBuffer();
const iconB64 = iconBuf.toString('base64');

const svg = `
<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1024" y2="500" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0f1115"/>
      <stop offset="1" stop-color="#151a16"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <image x="120" y="110" width="280" height="280" href="data:image/png;base64,${iconB64}"/>
  <text x="460" y="255" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="800" fill="#ffffff" letter-spacing="2">FORZA AI</text>
  <text x="462" y="305" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#22c55e">Entrenamiento, nutrición y coach con IA</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(`${OUT_DIR}/feature-graphic-1024x500.png`);

// 3) App Store icon: 1024x1024 PNG, full-bleed (no rounded corners baked in
// beyond the source art), no alpha channel (Apple applies the mask itself;
// a transparent PNG is rejected). Fill the source icon's transparent corners
// with its own background color so there's no visible seam.
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: '#0f1115' },
})
  .composite([{ input: ICON_SRC }])
  .flatten({ background: '#0f1115' })
  .removeAlpha()
  .png()
  .toFile(`${OUT_DIR}/app-store-icon-1024.png`);

console.log('done');
