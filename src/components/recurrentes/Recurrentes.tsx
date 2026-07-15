import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type RecurringTransaction } from "@/db/schema";
import { formatMonto, parseToCentavos, type Moneda } from "@/lib/money";
import { crearRecurrente, toggleActivaRecurrente } from "@/services/recurrentes";
import { Sheet } from "@/components/ui/Sheet";
import { HudButton } from "@/components/ui/HudButton";
import { HudCard } from "@/components/ui/HudCard";
import { MonedaToggle } from "@/components/ui/MonedaToggle";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { cn, glassInput } from "@/lib/utils";

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const ETIQUETA_FRECUENCIA: Record<RecurringTransaction["frecuencia"], string> = {
  mensual: "Mensual",
  quincenal: "Cada 15 días",
  semanal: "Semanal",
};

function etiquetaPeriodo(r: RecurringTransaction): string {
  if (r.frecuencia === "mensual") return `día ${r.dia_del_periodo}`;
  if (r.frecuencia === "semanal") return DIAS_SEMANA[r.dia_del_periodo] ?? "";
  return "cada 15 días";
}

export function Recurrentes({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const recurrentes = useLiveQuery(() => db.recurring_transactions.toArray(), []);
  const categorias = useLiveQuery(
    async () => (await db.categories.toArray()).filter((c) => c.tipo !== "transferencia"),
    [],
  );
  const cuentas = useLiveQuery(
    async () => (await db.accounts.toArray()).filter((a) => a.activa),
    [],
  );

  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<Moneda>("VES");
  const [categoriaId, setCategoriaId] = useState<number | "">("");
  const [cuentaId, setCuentaId] = useState<number | "">("");
  const [frecuencia, setFrecuencia] = useState<RecurringTransaction["frecuencia"]>("mensual");
  const [diaDelPeriodo, setDiaDelPeriodo] = useState(1);

  const centavos = parseToCentavos(monto);

  async function agregar() {
    if (centavos <= 0 || descripcion.trim() === "" || categoriaId === "") return;
    await crearRecurrente({
      descripcion: descripcion.trim(),
      monto_centavos: centavos,
      moneda,
      categoria_id: categoriaId,
      cuenta_id: cuentaId === "" ? null : cuentaId,
      frecuencia,
      dia_del_periodo: frecuencia === "quincenal" ? 0 : diaDelPeriodo,
    });
    setDescripcion("");
    setMonto("");
    setCategoriaId("");
    setCuentaId("");
    setDiaDelPeriodo(1);
  }

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo="Recurrentes">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {(recurrentes ?? []).length === 0 && (
            <p className="text-texto-sec text-sm">Sin gastos/ingresos recurrentes.</p>
          )}
          {(recurrentes ?? []).map((r) => {
            const cat = categorias?.find((c) => c.id === r.categoria_id);
            return (
              <HudCard key={r.id} innerClassName="p-3 flex items-center gap-3">
                <CategoryIcon icono={cat?.icono ?? ""} color={cat?.color ?? "primario"} size={18} />
                <div className="grow min-w-0">
                  <p className="text-sm text-texto truncate">{r.descripcion}</p>
                  <p className="text-[11px] text-texto-sec truncate">
                    {ETIQUETA_FRECUENCIA[r.frecuencia]} · {etiquetaPeriodo(r)}
                  </p>
                </div>
                <span className="font-display text-sm text-texto shrink-0">
                  {formatMonto(r.monto_centavos, r.moneda)}
                </span>
                <button
                  onClick={() => void toggleActivaRecurrente(r.id!, !r.activa)}
                  className={cn(
                    "font-display text-[10px] tracking-wider px-2 py-1 rounded-full shrink-0",
                    r.activa ? "text-exito" : "text-texto-sec",
                  )}
                >
                  {r.activa ? "ON" : "OFF"}
                </button>
              </HudCard>
            );
          })}
        </div>

        <div className="border-t border-borde pt-4 flex flex-col gap-3">
          <p className="text-xs text-texto-sec font-display tracking-wider uppercase">
            Nuevo recurrente
          </p>
          <input
            placeholder="Descripción (ej. Netflix)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={glassInput}
          />
          <div className="flex items-center gap-3">
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={glassInput}
            />
            <MonedaToggle value={moneda} onChange={setMoneda} />
          </div>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : "")}
            className={glassInput}
          >
            <option value="">Categoría…</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.tipo === "ingreso" ? "ingreso" : "gasto"})
              </option>
            ))}
          </select>
          <select
            value={cuentaId}
            onChange={(e) => setCuentaId(e.target.value ? Number(e.target.value) : "")}
            className={glassInput}
          >
            <option value="">Sin cuenta</option>
            {(cuentas ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <div className="flex glass rounded-full p-1">
            {(["mensual", "quincenal", "semanal"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFrecuencia(f)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-full font-display text-xs transition-colors",
                  frecuencia === f ? "bg-primario/90 text-fondo" : "text-texto-sec",
                )}
              >
                {ETIQUETA_FRECUENCIA[f]}
              </button>
            ))}
          </div>
          {frecuencia === "mensual" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
                Día del mes
              </span>
              <input
                type="number"
                min={1}
                max={31}
                value={diaDelPeriodo}
                onChange={(e) => setDiaDelPeriodo(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
                className={glassInput}
              />
            </label>
          )}
          {frecuencia === "semanal" && (
            <select
              value={diaDelPeriodo}
              onChange={(e) => setDiaDelPeriodo(Number(e.target.value))}
              className={glassInput}
            >
              {DIAS_SEMANA.map((nombre, i) => (
                <option key={nombre} value={i}>
                  {nombre}
                </option>
              ))}
            </select>
          )}
          <HudButton
            onClick={() => void agregar()}
            disabled={centavos <= 0 || descripcion.trim() === "" || categoriaId === ""}
          >
            Agregar recurrente
          </HudButton>
        </div>
      </div>
    </Sheet>
  );
}
