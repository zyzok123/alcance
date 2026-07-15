# Alcance

App personal de finanzas para ingreso variable en bolívares con devaluación
constante. Una sola misión: **que el dinero alcance y verlo venir** — no
descubrirlo cuando ya no hay. 100% offline, todo vive en el teléfono.

Estética: HUD de juego cyberpunk. Registro de un gasto: **3 taps, menos de
5 segundos**.

## 📲 Instalar en Android

Escanea el QR → descarga el `.apk` → ábrelo → listo.

![QR al último release](docs/qr-release.png)

O entra directo a
[**github.com/zyzok123/alcance/releases/latest**](https://github.com/zyzok123/alcance/releases/latest)
desde el navegador del teléfono. Es un APK debug para uso personal
(sideload): Android pedirá permitir "instalar apps de origen desconocido".

Cada push a `main` publica un Release nuevo automáticamente
(`v0.1.1`, `v0.1.2`, …). Dentro de la app: **Ajustes → Buscar actualización**.

## 🛠 Desarrollo

```bash
npm install        # dependencias
npm run dev        # dev server web (localhost:5173)
npm run build      # typecheck + build a dist/
npm run qr         # regenera docs/qr-release.png
npm run apk:debug  # build → cap sync → gradle assembleDebug (Windows)
```

El APK local queda en:
`android/app/build/outputs/apk/debug/app-debug.apk`
(requiere Android SDK local; si no lo tienes, deja que GitHub Actions compile).

## Stack

React 18 · Vite · TypeScript estricto · Tailwind v4 · Dexie (IndexedDB) ·
Capacitor 8 · framer-motion

Arquitectura, decisiones y estado de fases: ver [CLAUDE.md](CLAUDE.md).
