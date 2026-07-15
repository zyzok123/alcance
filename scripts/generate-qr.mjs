// Genera el QR que apunta al último Release (APK descargable).
// Uso: npm run qr  → escribe docs/qr-release.png
import { mkdir } from "node:fs/promises";
import QRCode from "qrcode";

const URL = "https://github.com/zyzok123/alcance/releases/latest";

await mkdir("docs", { recursive: true });
await QRCode.toFile("docs/qr-release.png", URL, {
  width: 480,
  margin: 2,
  color: { dark: "#0A0E14", light: "#FFFFFF" },
});

console.log(`QR generado en docs/qr-release.png → ${URL}`);
