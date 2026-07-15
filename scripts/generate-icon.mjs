import sharp from "sharp";

const BG = "#0B1A16";
const RING = "#5FD6A8";
const DOT = "#F2A765";
const TRACK = "#1C2635";

function gaugeSvg({ size, ringR, ringW, dotR, background, transparent }) {
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * ringR;
  const dash = circ * 0.72;
  const bg = transparent ? "" : `<rect width="${size}" height="${size}" fill="${background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg}
    <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${TRACK}" stroke-width="${ringW}"/>
    <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${RING}" stroke-width="${ringW}"
      stroke-dasharray="${dash} ${circ}" stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"/>
    <circle cx="${cx}" cy="${cy}" r="${dotR}" fill="${DOT}"/>
  </svg>`;
}

async function run() {
  // Ícono flat (legacy / otras plataformas): 1024, con fondo.
  await sharp(Buffer.from(gaugeSvg({ size: 1024, ringR: 360, ringW: 72, dotR: 100, background: BG })))
    .png()
    .toFile("resources/icon.png");

  // Adaptive icon: background sólido.
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${BG}"/></svg>`))
    .png()
    .toFile("resources/icon-background.png");

  // Adaptive icon: foreground, glifo más chico centrado en la safe-zone (~66%).
  await sharp(Buffer.from(gaugeSvg({ size: 1024, ringR: 260, ringW: 56, dotR: 72, transparent: true })))
    .png()
    .toFile("resources/icon-foreground.png");

  // Splash: 2732, glifo chico centrado.
  await sharp(Buffer.from(gaugeSvg({ size: 2732, ringR: 320, ringW: 60, dotR: 90, background: BG })))
    .png()
    .toFile("resources/splash.png");
  await sharp(Buffer.from(gaugeSvg({ size: 2732, ringR: 320, ringW: 60, dotR: 90, background: BG })))
    .png()
    .toFile("resources/splash-dark.png");

  console.log("OK");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
