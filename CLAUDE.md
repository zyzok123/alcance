# CLAUDE.md — Alcance

Memoria entre sesiones. Actualizar al final de cada fase. **No borrar el
contexto personal.**

## Contexto personal (vive aquí y dentro de la app)

Ronald cobra ingreso variable, mayoría en bolívares, en Venezuela, con
devaluación constante. El problema no es ganar poco: el dinero se esfuma en
gastos hormiga antes de organizarlo, y al querer cambiar a divisas ya se
devaluó. Misión única de la app: **que el dinero alcance y verlo venir**.
Todo registro es MANUAL (el banco no siempre notifica) → la velocidad de
registro es sagrada: >5 segundos = fracaso. Tono motivador, nunca punitivo:
celebrar rachas, avisar a tiempo, cero culpa ("Te pasaste $X hoy. Mañana tu
día es de $Y. Seguimos.").

## Estado de fases

| Fase | Contenido | Estado |
|------|-----------|--------|
| 1 | Base + Capacitor + Dexie schema completo + registro ultrarrápido + dashboard gauge + sobre manual + seeds + hormigas auto + CI Release | ✅ **Completada** (2026-07-14) |
| 2 | Payday wizard + deudas + sobres automáticos + rachas | ⬜ Pendiente |
| 3 | Tasas DolarAPI con caché + doble moneda completa + patrimonio + selector de tasa | ⬜ Pendiente |
| 4 | Notificaciones locales + recurrentes + contador hormiga con proyección + reportes Recharts | ⬜ Pendiente |
| 5 | Export/import JSON + sync opcional Supabase + pulido (splash, ícono, animaciones) + release firmado | ⬜ Pendiente |

Regla: UNA fase a la vez. No avanzar sin OK explícito de Ronald.

## Stack real instalado

- React 18.3 + Vite 8 + **TypeScript 7.0 (port nativo Go)** estricto
  (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)
- Tailwind **v4** (config CSS-first vía `@theme` en `src/index.css`, sin
  tailwind.config.js) + plugin `@tailwindcss/vite`
- Dexie 4 + dexie-react-hooks (`useLiveQuery` = UI reactiva a la BD)
- Capacitor **8** (`@capacitor/core|cli|android|haptics`)
- framer-motion 12, lucide-react (íconos), @fontsource (fuentes locales)
- shadcn/ui: `components.json` + `cn()` listos para `npx shadcn add`;
  Fase 1 no necesitó primitives Radix (componentes HUD propios con
  clip-path). Incorporar cuando haga falta (dialogs del wizard Fase 2).

## Decisiones técnicas (y por qué)

1. **Dinero = enteros en centavos**, siempre. Tasas = enteros ×10000
   (`tasa_x10000`). TODA la aritmética vive en `src/lib/money.ts`. Ningún
   componente hace matemática de dinero.
2. **Fechas = strings ISO locales** (`YYYY-MM-DD` / `YYYY-MM-DDTHH:mm:ss`),
   ordenables lexicográficamente. Nunca `toISOString()` (UTC desplazaría el
   día en Venezuela UTC-4). Helpers en `src/lib/dates.ts`.
3. **`capacitor.config.json` (no .ts)**: el CLI de Capacitor transpila
   config .ts con la API JS de TypeScript, que TS 7 (Go) ya no tiene →
   `Cannot read properties of undefined (reading 'CommonJS')`. JSON evita
   el problema para siempre.
4. **Tasa de cambio Fase 1 = manual** (`settings.tasa_manual_x10000`,
   editable en Ajustes; 0 = sin configurar → el dashboard muestra chip
   ámbar "CONFIGURA TASA"). Si se registra un gasto Bs sin tasa:
   `monto_usd = 0`, `fuente_tasa = null`, no se marca hormiga — el monto Bs
   queda correcto y auditable. Fase 3 reemplaza `getTasa` por
   DolarAPI+caché sin tocar transacciones históricas (el equivalente USD se
   congela al registrar, NUNCA se recalcula).
5. **`monto_gastado_usd` del sobre NO se almacena**: se calcula siempre
   desde transactions (una sola fuente de verdad, cero desincronización).
6. **`payday_plan_id` nullable en weekly_envelopes**: null = sobre creado
   manualmente (Fase 1). El wizard de Fase 2 los creará con plan.
7. **Sin router**: una pantalla (dashboard) + bottom sheets controladas por
   estado en `App.tsx`. Un flujo de una mano. Añadir router solo si Fase 4
   (reportes) lo pide.
8. **Booleanos no se indexan** en Dexie (IndexedDB no lo permite):
   `es_hormiga`, `es_favorita`, `activa` se filtran en memoria (volúmenes
   pequeños, personal).
9. **Guardar al tocar categoría** (sin botón "guardar"): FAB → dígitos →
   categoría = 3 taps. Cuenta y moneda salen de settings defaults.
10. **Fuentes @fontsource** empaquetadas por Vite en dist/ → dentro del APK
    → offline total. Prohibido CDN en runtime.
11. **Rendimiento**: animaciones solo `transform`/`opacity` (barra usa
    `scaleX`, sheets `translateY`), máx. 2 glows por pantalla (gauge cian +
    FAB magenta), `[data-low-stim]` en `<html>` + `MotionConfig
    reducedMotion` apagan todo (modo bajo estímulo en Ajustes).
12. **Versión de app**: `VITE_APP_VERSION` inyectada por CI
    (`v0.1.<run_number>`); local = `v0.1.0-dev`. "Buscar actualización"
    compara contra tag del último Release de GitHub (falla en silencio sin
    internet).
13. **Cálculo del héroe**: `(asignado − gastado) / días restantes`
    (inclusive hoy, floor). Gauge = fracción consumida del presupuesto con
    el que ARRANCÓ el día. Negativo → mensaje sin culpa con presupuesto de
    mañana.
14. El dashboard calcula "hoy" al ejecutar la query; cruzar medianoche con
    la app abierta no refresca solo (aceptado Fase 1; reabrir la app basta).

## Estructura

```
src/
  lib/        money.ts (centavos), dates.ts (ISO local), utils.ts (cn)
  db/         schema.ts (Dexie completo, todas las fases), seed.ts (populate)
  services/   transactions, envelopes, hormigas, updates, haptics
  hooks/      useSettings, useDashboard (useLiveQuery)
  components/
    ui/        HudCard (clip-corner + borde 1px), HudButton, Sheet, CategoryIcon
    dashboard/ Dashboard, GaugeHero, EnvelopeBar, HormigaCard, UltimosMovimientos
    registro/  QuickAdd, Numpad, TerminalFeedback
    sobre/     CrearSobre (manual, Fase 1)
    ajustes/   Ajustes
    hormigas/  HormigasDetalle
android/      proyecto nativo Capacitor (commiteado; CI hace cap sync + gradle)
scripts/      generate-qr.mjs (npm run qr)
docs/         qr-release.png → releases/latest
```

## Diseño "HUD financiero"

Tokens SOLO en `@theme` de `src/index.css` (fondo #0A0E14, superficie
#101623, borde #1C2635, primario #00E5FF, secundario #FF2ED1, éxito
#39FF88, alerta #FFB020, peligro #FF5C7A). Chakra Petch (números,
`tabular-nums` — los montos no bailan) + Space Grotesk (UI). Esquinas
cortadas con `clip-path` (`.clip-corner`, `.clip-corner-sm`) — cero
border-radius. Retícula `.hud-grid-bg` <5% opacidad. Glitch-flash ≤300ms.
Feedback terminal "TRANSACCIÓN REGISTRADA ✓" 800ms + háptica.

Nota entorno: el skill `frontend-design` NO está en `/mnt/skills/` (ruta
Linux); en esta máquina vive en
`~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/`.

## Build / distribución

- `npm run apk:debug` (Windows) → APK en
  `android/app/build/outputs/apk/debug/app-debug.apk`. Sin SDK local, usar CI.
- CI `.github/workflows/build-apk.yml`: push a main → Java 17 + gradle
  assembleDebug → **Release público** con tag `v0.1.<run_number>` y el APK
  adjunto. QR del README apunta a `releases/latest`.
- Repo: `github.com/zyzok123/alcance`.
- **Release firmado (Fase 5)**: crear keystore propio:
  `keytool -genkeypair -v -keystore alcance.keystore -alias alcance -keyalg RSA -keysize 2048 -validity 10000`
  → subir como GitHub Secrets (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`,
  `KEY_ALIAS`, `KEY_PASSWORD`). ⚠️ **EL KEYSTORE NO SE PUEDE PERDER**: sin
  él no hay actualizaciones de la app firmada (habría que desinstalar y
  perder los datos locales). El APK debug basta para sideload personal
  (fases 1-4).

## Pendientes conocidos (deuda aceptada)

- Favoritos de un tap preconfigurados ("Café $1") — Fase 2; hoy existe
  "repetir último gasto".
- Ícono/splash personalizados — Fase 5 (hoy usa defaults de Capacitor).
- Racha de días, patrimonio USD — Fases 2-3 (el dashboard los incorporará).
- Verificación visual en navegador quedó pendiente en Fase 1 (permisos del
  Browser pane denegados); el build compila y la lógica es useLiveQuery
  puro. Probar en el APK.
