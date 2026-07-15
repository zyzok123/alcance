import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { db, type Category } from "@/db/schema";
import {
  formatCentavos,
  formatMonto,
  parseToCentavos,
  vesToUsdCentavos,
  type Moneda,
} from "@/lib/money";
import { registrarGasto, repetirUltimoGasto, ultimoGasto } from "@/services/transactions";
import { useSettings } from "@/hooks/useSettings";
import { useTasaVigente } from "@/hooks/useTasaVigente";
import { etiquetaFuente } from "@/services/tasas";
import { Sheet } from "@/components/ui/Sheet";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { MonedaToggle } from "@/components/ui/MonedaToggle";
import { TerminalFeedback } from "./TerminalFeedback";
import { Numpad, aplicarTecla } from "./Numpad";

/**
 * Registro ultrarrápido — la feature más crítica.
 * Flujo: FAB → dígitos → tap categoría → guardado. TRES TAPS MÁXIMO.
 * El tap en la categoría GUARDA de inmediato: no hay botón "guardar".
 */
export function QuickAdd({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const settings = useSettings();
  const [entrada, setEntrada] = useState("");
  const [moneda, setMoneda] = useState<Moneda | null>(null);
  const [verTodas, setVerTodas] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const tasaVigente = useTasaVigente();
  const monedaActiva: Moneda = moneda ?? settings?.moneda_registro_default ?? "VES";
  const tasa = tasaVigente?.tasaX10000 ?? 0;
  const centavos = parseToCentavos(entrada);
  const equivUsd = monedaActiva === "VES" ? vesToUsdCentavos(centavos, tasa) : centavos;

  const categorias = useLiveQuery(
    async () => (await db.categories.toArray()).filter((c) => c.tipo === "gasto"),
    [],
  );
  const ultimo = useLiveQuery(() => ultimoGasto(), [], undefined);

  const listaCategorias = useMemo(() => {
    if (!categorias) return [];
    const favoritas = categorias.filter((c) => c.es_favorita);
    const resto = categorias.filter((c) => !c.es_favorita);
    return verTodas ? [...favoritas, ...resto] : favoritas;
  }, [categorias, verTodas]);

  function reset() {
    setEntrada("");
    setMoneda(null);
    setVerTodas(false);
  }

  async function guardar(cat: Category) {
    if (centavos <= 0 || cat.id === undefined) return;
    await registrarGasto({
      monto_centavos: centavos,
      moneda: monedaActiva,
      categoria_id: cat.id,
      cuenta_id: settings?.cuenta_default_id ?? null,
    });
    setGuardado(true);
  }

  async function repetir() {
    const tx = await repetirUltimoGasto();
    if (tx) setGuardado(true);
  }

  function alTerminar() {
    setGuardado(false);
    reset();
    onCerrar();
  }

  const catUltimo =
    ultimo && ultimo.categoria_id !== null && categorias
      ? categorias.find((c) => c.id === ultimo.categoria_id)
      : undefined;

  return (
    <>
      <Sheet abierto={abierto} onCerrar={() => { reset(); onCerrar(); }} titulo="Registrar gasto">
        <div className="flex flex-col gap-3">
          {/* Monto en edición + toggle de moneda */}
          <div className="flex items-center justify-between gap-3">
            <div className="grow">
              <p className="font-display text-4xl text-texto min-h-[44px]">
                <span className="text-texto-sec text-xl mr-1">
                  {monedaActiva === "VES" ? "Bs" : "$"}
                </span>
                {entrada === "" ? <span className="text-texto-sec">0</span> : entrada}
              </p>
              {monedaActiva === "VES" && (
                <p className="font-display text-xs text-primario">
                  {tasa > 0 ? (
                    <>
                      ≈ $ {formatCentavos(equivUsd)}{" "}
                      <span className="text-texto-sec">({etiquetaFuente(tasaVigente?.fuente)})</span>
                    </>
                  ) : (
                    <span className="text-alerta flex items-center gap-1">
                      <TriangleAlert size={12} /> sin tasa: configúrala en Ajustes
                    </span>
                  )}
                </p>
              )}
            </div>
            <MonedaToggle value={monedaActiva} onChange={setMoneda} />
          </div>

          {/* Repetir último gasto: un tap */}
          {ultimo && catUltimo && (
            <button
              onClick={() => void repetir()}
              className="glass rounded-full bg-superficie px-3 py-2 flex items-center gap-2
                         text-sm text-texto-sec active:scale-[0.98] transition-transform self-start"
            >
              <RotateCcw size={14} className="text-secundario" />
              Repetir: {catUltimo.nombre} · {formatMonto(ultimo.monto_centavos, ultimo.moneda)}
            </button>
          )}

          {/* Grid de categorías: tap = guardar */}
          <div>
            <div className="grid grid-cols-4 gap-2">
              {listaCategorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => void guardar(cat)}
                  disabled={centavos <= 0}
                  className="glass rounded-xl bg-superficie py-3 flex flex-col items-center gap-1
                             active:scale-95 transition-transform disabled:opacity-35"
                >
                  <CategoryIcon icono={cat.icono} color={cat.color} />
                  <span className="text-[10px] text-texto-sec truncate w-full text-center px-1">
                    {cat.nombre}
                  </span>
                </button>
              ))}
            </div>
            {!verTodas && (
              <button
                onClick={() => setVerTodas(true)}
                className="text-primario font-display text-xs tracking-wider mt-2 uppercase"
              >
                Ver todas ▾
              </button>
            )}
          </div>

          <Numpad onTecla={(t) => setEntrada((e) => aplicarTecla(e, t))} />
        </div>
      </Sheet>
      {guardado && <TerminalFeedback onDone={alTerminar} />}
    </>
  );
}
