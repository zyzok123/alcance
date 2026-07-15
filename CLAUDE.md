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
| 2 | Payday wizard + deudas + sobres automáticos + rachas | ✅ **Completada** (2026-07-15) |
| 3 | Tasas DolarAPI con caché + doble moneda completa + patrimonio + selector de tasa | ✅ **Completada** (2026-07-15) |
| 4 | Notificaciones locales + recurrentes + contador hormiga con proyección + reportes Recharts | ✅ **Completada** (2026-07-15) |
| 5 | Export/import JSON + pulido (splash, ícono) + sync Supabase + bloqueo biométrico ✅ · Release firmado ⬜ (necesita keystore de Ronald) | 🟡 **Parcial** (2026-07-15) |

Regla: UNA fase a la vez. No avanzar sin OK explícito de Ronald.

## Stack real instalado

- React 18.3 + Vite 8 + **TypeScript 7.0 (port nativo Go)** estricto
  (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)
- Tailwind **v4** (config CSS-first vía `@theme` en `src/index.css`, sin
  tailwind.config.js) + plugin `@tailwindcss/vite`
- Dexie 4 + dexie-react-hooks (`useLiveQuery` = UI reactiva a la BD)
- Capacitor **8** (`@capacitor/core|cli|android|haptics|local-notifications`)
- framer-motion 12, lucide-react (íconos), @fontsource (fuentes locales)
- recharts 3 (Reportes), sharp (devDependency, solo para regenerar
  ícono/splash vía `npm run icon` — no se usa en runtime de la app)
- `@supabase/supabase-js` (sync opcional, Fase 5), `@capgo/capacitor-native-biometric`
  (bloqueo huella/PIN, Fase 5)
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
4. **Tasa de cambio (Fase 3)**: `services/tasas.ts` → `getTasaVigente()`
   resuelve: caché de hoy (DolarAPI) → caché más reciente → manual →
   sin configurar. `settings.tasa_preferida` es `"bcv"|"paralelo"|"manual"`
   (ya NO existe "binance" como fuente separada: la API de Binance P2P
   bloquea CORS sin proxy propio — comprobado con curl, `Access-Control-
   Allow-Origin` solo permite `p2p.binance.com` — y Ronald confirmó que
   el "paralelo" de DolarAPI (`ve.dolarapi.com/v1/dolares`) YA ES la
   cifra de Binance en la práctica. Se cachea igual en
   `tasa_binance_x10000` para no romper el campo, pero es el mismo
   número que `tasa_paralelo_x10000`). Fetch offline-first: falla en
   silencio (services/updates.ts ya tenía este patrón), la app sigue con
   la última caché o la tasa manual; `App.tsx` reintenta el fetch cada
   vez que se abre. Si se registra un gasto Bs sin tasa disponible:
   `monto_usd = 0`, `fuente_tasa = null`, no se marca hormiga — el monto
   Bs queda correcto y auditable. El equivalente USD se congela al
   registrar, NUNCA se recalcula (ni con tasas históricas ni al cambiar
   `tasa_preferida`).
5. **`monto_gastado_usd` del sobre NO se almacena**: se calcula siempre
   desde transactions (una sola fuente de verdad, cero desincronización).
6. **`payday_plan_id` nullable en weekly_envelopes**: null = sobre creado
   manualmente (Fase 1). El wizard de Fase 2 los creará con plan.
7. **Sin router**: una pantalla (dashboard) + bottom sheets controladas por
   estado en `App.tsx`. Un flujo de una mano. Fase 4 (reportes) NO terminó
   necesitándolo: `Reportes` es un `Sheet alto="full"` más, no una ruta.
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
15. **`Account.balance_actual_centavos` es MANUAL** (contraste con decisión
    #5: el sobre se deriva, la cuenta NO). Ronald lo actualiza a mano desde
    "Cuentas" cuando revisa su banco/billetera real (el banco no siempre
    avisa). `services/accounts.ts::ajustarBalanceCuenta` calcula el delta
    y crea una transacción auditable ("Ajuste de saldo", tipo
    transferencia, no cuenta como gasto/hormiga) para poder rastrear
    después qué se dejó de cargar. Patrimonio (Fase 3) = suma de cuentas
    activas a USD − deudas pendientes a USD.
16. **`generarPendientes` (recurrentes, Fase 4) corre en una única
    transacción Dexie** (`db.transaction("rw", [...], ...)`), no llamadas
    sueltas. Motivo real: React StrictMode duplica el `useEffect` que la
    dispara en dev, y sin la transacción cada invocación leía
    `ultima_generada` viejo antes de que la otra escribiera → generaba la
    misma transacción recurrente 2 veces. Verificado con test manual
    (recargar 2 veces seguidas) antes y después del fix. Cualquier función
    que lea-y-luego-escriba basada en una condición temporal (fechas,
    "ya se generó hoy") debe considerar este mismo riesgo.
17. **Sync Supabase (Fase 5, opcional) = last-write-wins por tabla completa**,
    no por fila: `subirNube()` borra todo en cada tabla de la nube y sube lo
    local; `bajarNube()` reemplaza todo lo local con lo de la nube
    (`services/sync.ts`). Justificado: app de un solo usuario en pocos
    devices, no colaborativa — sync fila-a-fila con timestamps sería
    complejidad sin beneficio real. `bajarNube()` es destructivo local →
    Ajustes pide confirmación explícita antes de llamarlo. anon key vive en
    el cliente a propósito (protección real es RLS en Supabase, no el
    secreto de la key); `supabase/schema.sql` tiene las 9 tablas espejo +
    política RLS permisiva para rol "anon" (sin login real, si se agrega
    después hay que cambiar las políticas a filtrar por `auth.uid()`).
18. **Bloqueo biométrico (Fase 5) se evalúa UNA vez al cargar `settings`**,
    no en cada cambio (`App.tsx`, flag `chequeoBloqueoHecho`) — si Ronald lo
    activa desde Ajustes a mitad de sesión, no lo saca de golpe de la app
    que ya está viendo. `services/biometria.ts` usa
    `@capgo/capacitor-native-biometric` con `useFallback: true` (acepta
    PIN/patrón si no hay huella). Sin biometría configurada en el equipo →
    toggle en Ajustes falla con aviso, no se activa el bloqueo.

## Estructura

```
src/
  lib/        money.ts (centavos), dates.ts (ISO local), utils.ts (cn)
  db/         schema.ts (Dexie completo, todas las fases), seed.ts (populate)
  services/   transactions, envelopes, hormigas, updates, haptics, debts,
              payday, rachas, tasas (DolarAPI+caché), accounts, patrimonio,
              notificaciones (local-notifications), recurrentes, reportes,
              backup (export/import JSON), sync (Supabase push/pull, Fase 5),
              biometria (huella/PIN, Fase 5)
  hooks/      useSettings, useDashboard, useTasaVigente (useLiveQuery)
  components/
    ui/        HudCard (glass), HudButton, Sheet, CategoryIcon, MonedaToggle
    dashboard/ Dashboard, GaugeHero, EnvelopeBar, HormigaCard, UltimosMovimientos
    registro/  QuickAdd, Numpad, TerminalFeedback
    sobre/     CrearSobre (manual, Fase 1)
    payday/    PaydayWizard (4 pasos, Fase 2)
    deudas/    Deudas (crear/listar/pagar, Fase 2)
    cuentas/   Cuentas (crear/listar/ajustar saldo, Fase 3)
    patrimonio/ Patrimonio (card dashboard, Fase 3)
    recurrentes/ Recurrentes (CRUD, Fase 4, se abre desde Ajustes)
    reportes/  Reportes (Sheet alto="full", Recharts, Fase 4)
    ajustes/   Ajustes (tasa, notificaciones, backup, recurrentes, sync, biometría)
    hormigas/  HormigasDetalle (con proyección de fin de mes)
    bloqueo/   PantallaBloqueo (gate biométrico antes del dashboard, Fase 5)
android/      proyecto nativo Capacitor (commiteado; CI hace cap sync + gradle)
scripts/      generate-qr.mjs (npm run qr), generate-icon.mjs (npm run icon)
resources/    icon.png / icon-foreground.png / icon-background.png / splash.png
              — fuente para `npm run icon` (regenera vía @capacitor/assets)
supabase/     schema.sql (tablas espejo + RLS, correr una vez en SQL Editor)
docs/         qr-release.png → releases/latest
```

## Diseño "Liquid Glass Lofi" (reemplazó el HUD neón en Fase 2)

Pivote total de estilo pedido por Ronald: paneles de vidrio estilo Apple
(blur + borde translúcido + esquinas redondeadas) sobre foto de fondo fija
(cafetería nocturna, `src/assets/fondo-cafeteria.jpg`) con overlay
verde-oscuro para legibilidad. Tokens SOLO en `@theme` de `src/index.css`:
fondo #0B1A16, superficie `rgba(235,250,240,.1)`, borde
`rgba(255,255,255,.22)`, primario #5FD6A8 (jade), secundario #F2A765
(ámbar), éxito #8FD97E, alerta #F0B955, peligro #EA8188. Chakra Petch
(números, `tabular-nums`) + Space Grotesk (UI) — sin cambios, la regla de
"los montos no bailan" sigue viva.

Clase `.glass` (blur 20px + saturate + borde + sheen superior) reemplaza
`.clip-corner`/`.clip-corner-sm` — ya no existen, todo usa `rounded-xl`/
`rounded-2xl`/`rounded-full` de Tailwind. `.hud-grid-bg` y el
glitch-flash de 300ms desaparecieron; la confirmación de registro ahora
es un pop suave (`.pop-in`, 220ms) sobre panel de vidrio, texto
"REGISTRADO ✓". `glow-cyan`/`glow-magenta` renombrados a
`glow-primario`/`glow-secundario` (máx. 2 por pantalla sigue aplicando).

Componentes compartidos nuevos: `MonedaToggle` (ui/) reemplaza el toggle
Bs/$ duplicado en 3 sheets; `glassInput` (lib/utils.ts) reemplaza el
`inputCls` duplicado en 4 sheets.

Nota de rendimiento: `backdrop-filter` es más caro que el `clip-path`
anterior — si se ve lento en el APK real (no solo en dev), primer
sospechoso es reducir blur o cantidad de paneles glass simultáneos en
pantalla, no volver al HUD viejo sin avisar a Ronald.

Nota entorno: el skill `frontend-design` NO está en `/mnt/skills/` (ruta
Linux); en esta máquina vive en
`~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/`.

## Build / distribución

- `npm run apk:debug` (Windows) → APK en
  `android/app/build/outputs/apk/debug/app-debug.apk`. Sin SDK local, usar CI.
- CI `.github/workflows/build-apk.yml`: push a main → Node 22 + Java 21 +
  gradle assembleDebug → **Release público** con tag `v0.1.<run_number>` y
  el APK adjunto. QR del README apunta a `releases/latest`. (Capacitor 8
  exige Node ≥22 y Java 21 — versiones menores fallan en `cap sync` /
  `compileDebugJavaWithJavac`.)
- Repo: `github.com/zyzok123/alcance`.
- **Ícono/splash**: `npm run icon` regenera todo desde `resources/*.png`
  (fuente: `scripts/generate-icon.mjs`, un gauge jade+ámbar sobre fondo
  #0B1A16 — mismo motivo que `GaugeHero`). Corre `@capacitor/assets
  generate --android` por debajo. Si cambia la paleta de `index.css`,
  actualizar los hex en `generate-icon.mjs` y volver a correr.

### Pendiente de Ronald: release firmado

No lo hice yo — requiere un keystore que solo Ronald debe generar y
guardar (ver advertencia abajo). Pasos exactos cuando quiera activarlo:

1. `keytool -genkeypair -v -keystore alcance.keystore -alias alcance -keyalg RSA -keysize 2048 -validity 10000`
2. Subir como GitHub Secrets: `KEYSTORE_BASE64` (el .keystore en base64:
   `certutil -encode alcance.keystore keystore.b64` en Windows),
   `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
3. Avisarme — en ese momento agrego a `build-apk.yml`: un step que
   decodifica el secret a `android/app/alcance.keystore`, el bloque
   `signingConfigs`/`buildTypes.release` en `android/app/build.gradle`
   leyendo esas env vars, y cambio `assembleDebug` → `assembleRelease`
   (o ambos, si querés seguir probando con debug también).

⚠️ **EL KEYSTORE NO SE PUEDE PERDER**: sin él no hay actualizaciones de
la app firmada (habría que desinstalar y perder los datos locales). El
APK debug basta para sideload personal mientras tanto.

### Sync Supabase (opcional) — hecho

Implementado: proyecto Supabase ya creado por Ronald, `supabase/schema.sql`
corrido (9 tablas espejo + RLS anon), `services/sync.ts` con
`subirNube()`/`bajarNube()` (ver decisión #17), botones en Ajustes bajo
"Sincronizar con la nube (opcional)". La app sigue funcionando 100%
offline si no se usa — sync es manual (botón), no automático en
background todavía.

## Pendientes conocidos (deuda aceptada)

- Favoritos de un tap preconfigurados ("Café $1") — hoy existe "repetir
  último gasto" como equivalente parcial.
- Sin fuente separada de Binance (ver decisión #4) — "Paralelo" de
  DolarAPI cumple ese rol. Si Ronald quiere Binance real, requiere un
  proxy propio (Cloudflare Worker u otro) porque su API bloquea CORS.
- Sin edición/borrado de transacciones — todo registro es append-only
  (por diseño: velocidad > corrección posterior). Errores de monto se
  resuelven con "Ajuste de saldo" en Cuentas, no editando la transacción.
- Bundle JS ~850KB (gzip ~258KB) por recharts — funciona bien pero vite
  avisa "chunk > 500kb". Si algún día importa el tamaño del APK/tiempo de
  carga, code-splitting de `Reportes.tsx` con `React.lazy` es la mejora
  obvia (no lo hice: sin router ni evidencia real de que sea un problema).
- Release firmado: documentado arriba en "Build / distribución", pendiente
  de que Ronald provea el keystore.
- Sync Supabase es manual (botón subir/bajar), no automático en background
  ni al reconectar — si algún día importa, agregar un toggle "auto-sync".
- Bloqueo biométrico solo probado en dev (no se puede probar huella/PIN en
  browser) — falta verificar en el APK real en un dispositivo Android.

## Fase 1 — cierre (2026-07-15)

APK publicado: `v0.1.3`
(github.com/zyzok123/alcance/releases/tag/v0.1.3). CI verde tras 2 fixes:
- Capacitor CLI 8 exige **Node ≥22** (CI tenía 20 → fallaba en `cap sync`).
- Capacitor Android 8 exige **Java 21** (CI tenía 17 → fallaba
  `compileDebugJavaWithJavac`, "invalid source release: 21").

Ambos ya corregidos en `.github/workflows/build-apk.yml`.

## Fase 2 — cierre (2026-07-15)

Payday wizard (4 pasos: cobro → deudas a pagar → protegido/semanas →
confirmar), deudas (crear/pagar con transacción auditable tipo
transferencia), sobres automáticos ligados a `payday_plan_id`, racha =
días consecutivos completos sin pasarse del presupuesto diario (decisión
de Ronald, no días de registro). Todo probado end-to-end en dev
(IndexedDB verificado a mano). Después de esta fase, Ronald pidió un
rediseño total: "Liquid Glass Lofi" (ver sección de Diseño) reemplazó el
HUD neón — mismo dinero/fechas/lógica, solo cambió el chrome visual.

## Fase 3 — cierre (2026-07-15)

`services/tasas.ts` trae BCV/paralelo de `ve.dolarapi.com/v1/dolares`
(gratis, sin key, `Access-Control-Allow-Origin: *`, confirmado con
curl). Caché diaria en `exchange_rates_cache`, resolución en cascada
(hoy → última caché → manual), selector en Ajustes, chip del dashboard
muestra fuente real. Cuentas (Fase 3) con balance manual + "ajustar
saldo" auditable. Patrimonio = cuentas activas a USD − deudas
pendientes, card en dashboard. Doble moneda agregada en gauge, sobre,
últimos movimientos y deudas (VES muestra su USD congelado si existe;
USD muestra Bs al tipo de cambio vigente, etiquetado "hoy" por ser
aproximado). Binance quedó sin fuente automática — ver Pendientes
conocidos.

## Fase 4 — cierre (2026-07-15)

Notificación diaria local (`@capacitor/local-notifications`, hora
configurable en Ajustes, pide permiso al activar, falla mostrando aviso
si se lo niegan). Recurrentes: CRUD en Ajustes → "Gastos e ingresos
recurrentes", `generarPendientes()` corre al abrir la app (mensual =
día del mes, semanal = día de la semana 0-6, quincenal = cada 15 días
desde la última vez) — **ver decisión #16**, tenía race condition real
que arreglé y verifiqué. Hormigas: proyección de fin de mes
(`(total_hasta_hoy / día_actual) × días_del_mes`) en `HormigasDetalle`.
Reportes: sheet full con pie de gasto por categoría + barras de gasto
por día (ámbar si ese día tuvo hormiga), usando datos reales del mes
via `services/reportes.ts`. Todo probado en dev con transacciones reales
(no solo con la BD vacía).

## Fase 5 — cierre parcial (2026-07-15)

Hecho: export/import JSON (`services/backup.ts`, importar pide
confirmación explícita porque reemplaza TODO y es irreversible), ícono +
splash nuevos (gauge jade/ámbar, `npm run icon` para regenerar),
`capacitor.config.json` con el color de fondo de la paleta nueva, sync
Supabase completo (Ronald ya creó el proyecto, ver decisión #17) y
bloqueo biométrico completo (ver decisión #18).

Sin hacer (necesita a Ronald): release firmado — ver instrucciones
exactas en "Build / distribución", requiere que genere y guarde el
keystore.

Con esto, fases 1-4 cerradas y fase 5 completa salvo el release firmado.
Próxima sesión: si Ronald trae el keystore, activar esa pieza puntual; si
no, no queda fase nueva pendiente por iniciar sin pedirle prioridades
(recurrentes avanzados, ajustes de UI, sync automático en background,
probar biometría en APK real, etc. serían fuera del plan original de 5
fases).
