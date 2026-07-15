import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { TriangleAlert } from "lucide-react";
import { db } from "@/db/schema";
import {
  formatCentavos,
  formatMonto,
  parseToCentavos,
  vesToUsdCentavos,
  type Moneda,
} from "@/lib/money";
import { hoyISO } from "@/lib/dates";
import { useSettings } from "@/hooks/useSettings";
import { useTasaVigente } from "@/hooks/useTasaVigente";
import { crearPaydayPlan, sugerirNumSemanas } from "@/services/payday";
import { Sheet } from "@/components/ui/Sheet";
import { HudButton } from "@/components/ui/HudButton";
import { HudCard } from "@/components/ui/HudCard";
import { MonedaToggle } from "@/components/ui/MonedaToggle";
import { cn, glassInput } from "@/lib/utils";

type Paso = 1 | 2 | 3 | 4;

export function PaydayWizard({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const settings = useSettings();
  const [paso, setPaso] = useState<Paso>(1);

  const [fechaCobro, setFechaCobro] = useState(hoyISO());
  const [monto, setMonto] = useState("");
  const [monedaCobro, setMonedaCobro] = useState<Moneda>("VES");
  const [cuentaId, setCuentaId] = useState<number | null>(null);

  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());

  const [protegido, setProtegido] = useState("");
  const [semanas, setSemanas] = useState<number | null>(null);
  const [semanasEditadas, setSemanasEditadas] = useState(false);

  const [enviando, setEnviando] = useState(false);

  const cuentas = useLiveQuery(
    async () => (await db.accounts.toArray()).filter((a) => a.activa),
    [],
  );
  const deudasPendientes = useLiveQuery(
    () => db.debts.where("estado").equals("pendiente").toArray(),
    [],
  );

  const tasaVigente = useTasaVigente();
  const tasa = tasaVigente?.tasaX10000 ?? 0;
  const centavosCobro = parseToCentavos(monto);
  const esUsd = monedaCobro !== "VES";
  const montoUsd = esUsd ? centavosCobro : vesToUsdCentavos(centavosCobro, tasa);

  const totalDeudasUsd = (deudasPendientes ?? [])
    .filter((d) => d.id !== undefined && seleccionadas.has(d.id))
    .reduce(
      (sum, d) =>
        sum + (d.moneda !== "VES" ? d.monto_centavos : vesToUsdCentavos(d.monto_centavos, tasa)),
      0,
    );

  const protegidoCentavos = parseToCentavos(protegido);
  const montoParaVivir = Math.max(0, montoUsd - totalDeudasUsd - protegidoCentavos);
  const semanasFinal = Math.max(1, semanas ?? 1);
  const porSemana = Math.floor(montoParaVivir / semanasFinal);

  // Sugerencia de semanas al entrar al paso 3, salvo que el usuario ya la haya tocado.
  useEffect(() => {
    if (paso === 3 && !semanasEditadas && settings) {
      setSemanas(sugerirNumSemanas(fechaCobro, settings.fechas_de_cobro));
    }
  }, [paso, semanasEditadas, settings, fechaCobro]);

  function reset() {
    setPaso(1);
    setFechaCobro(hoyISO());
    setMonto("");
    setMonedaCobro("VES");
    setCuentaId(settings?.cuenta_default_id ?? null);
    setSeleccionadas(new Set());
    setProtegido("");
    setSemanas(null);
    setSemanasEditadas(false);
  }

  function toggleDeuda(id: number) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmar() {
    if (enviando) return;
    setEnviando(true);
    try {
      await crearPaydayPlan({
        fecha_cobro: fechaCobro,
        monto_total_centavos: centavosCobro,
        moneda_cobro: monedaCobro,
        deudaIds: Array.from(seleccionadas),
        monto_protegido_centavos: protegidoCentavos,
        num_semanas: semanasFinal,
        cuenta_id: cuentaId,
      });
      reset();
      onCerrar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Sheet
      abierto={abierto}
      onCerrar={() => {
        reset();
        onCerrar();
      }}
      titulo={`Nuevo pago · ${paso}/4`}
    >
      <div className="flex flex-col gap-4">
        {paso === 1 && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
                Fecha de cobro
              </span>
              <input
                type="date"
                value={fechaCobro}
                onChange={(e) => setFechaCobro(e.target.value)}
                className={glassInput}
              />
            </label>

            <div className="flex items-center gap-3">
              <label className="flex flex-col gap-1.5 grow">
                <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
                  Monto cobrado
                </span>
                <input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className={glassInput}
                />
              </label>
              <MonedaToggle value={monedaCobro} onChange={setMonedaCobro} className="self-end" />
            </div>

            {monedaCobro === "VES" && tasa === 0 && (
              <p className="text-alerta text-xs flex items-center gap-1">
                <TriangleAlert size={12} /> sin tasa configurada: el equivalente USD saldrá en $0
              </p>
            )}
            {centavosCobro > 0 && (
              <p className="text-sm text-texto-sec">
                Equivalente: <span className="font-display text-primario">$ {formatCentavos(montoUsd)}</span>
              </p>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
                Cuenta (opcional)
              </span>
              <select
                value={cuentaId ?? ""}
                onChange={(e) => setCuentaId(e.target.value ? Number(e.target.value) : null)}
                className={glassInput}
              >
                <option value="">Sin registrar en cuenta</option>
                {(cuentas ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>

            <HudButton onClick={() => setPaso(2)} disabled={centavosCobro <= 0}>
              Siguiente
            </HudButton>
          </>
        )}

        {paso === 2 && (
          <>
            <p className="text-sm text-texto-sec">¿Qué deudas pagas con este cobro?</p>
            <div className="flex flex-col gap-2">
              {(deudasPendientes ?? []).length === 0 && (
                <p className="text-texto-sec text-sm">Sin deudas pendientes. 🟢</p>
              )}
              {(deudasPendientes ?? []).map((d) => {
                const marcada = d.id !== undefined && seleccionadas.has(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => d.id !== undefined && toggleDeuda(d.id)}
                    className={cn(
                      "glass rounded-xl px-3 py-3 flex items-center gap-3 text-left",
                      marcada && "bg-primario/20",
                    )}
                  >
                    <span
                      className={cn(
                        "size-4 shrink-0 rounded-md",
                        marcada ? "bg-primario" : "bg-borde",
                      )}
                    />
                    <div className="grow min-w-0">
                      <p className="text-sm text-texto truncate">{d.descripcion}</p>
                      <p className="text-[11px] text-texto-sec truncate">{d.acreedor}</p>
                    </div>
                    <span className="font-display text-sm text-texto shrink-0">
                      {formatMonto(d.monto_centavos, d.moneda)}
                    </span>
                  </button>
                );
              })}
            </div>
            {seleccionadas.size > 0 && (
              <p className="text-sm text-texto-sec">
                Total en deudas:{" "}
                <span className="font-display text-alerta">$ {formatCentavos(totalDeudasUsd)}</span>
              </p>
            )}
            <div className="flex gap-3">
              <HudButton variante="fantasma" onClick={() => setPaso(1)} className="grow">
                Atrás
              </HudButton>
              <HudButton onClick={() => setPaso(3)} className="grow">
                Siguiente
              </HudButton>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
                Protegido / ahorro (USD, opcional)
              </span>
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={protegido}
                onChange={(e) => setProtegido(e.target.value)}
                className={glassInput}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
                Semanas hasta el próximo cobro
              </span>
              <input
                type="number"
                min={1}
                max={12}
                value={semanasFinal}
                onChange={(e) => {
                  setSemanasEditadas(true);
                  setSemanas(Math.max(1, Number(e.target.value) || 1));
                }}
                className={glassInput}
              />
            </label>

            <HudCard innerClassName="p-4 flex flex-col gap-1.5">
              <p className="text-sm text-texto-sec">
                Para vivir:{" "}
                <span className="font-display text-primario">$ {formatCentavos(montoParaVivir)}</span>
              </p>
              <p className="text-sm text-texto-sec">
                Por semana:{" "}
                <span className="font-display text-exito">$ {formatCentavos(porSemana)}</span>
              </p>
            </HudCard>

            <div className="flex gap-3">
              <HudButton variante="fantasma" onClick={() => setPaso(2)} className="grow">
                Atrás
              </HudButton>
              <HudButton onClick={() => setPaso(4)} className="grow">
                Siguiente
              </HudButton>
            </div>
          </>
        )}

        {paso === 4 && (
          <>
            <HudCard innerClassName="p-4 flex flex-col gap-2">
              <p className="text-sm text-texto-sec">
                Cobro: <span className="font-display text-texto">{formatMonto(centavosCobro, monedaCobro)}</span>
              </p>
              <p className="text-sm text-texto-sec">
                Deudas pagadas: <span className="font-display text-alerta">$ {formatCentavos(totalDeudasUsd)}</span>
              </p>
              <p className="text-sm text-texto-sec">
                Protegido: <span className="font-display text-secundario">$ {formatCentavos(protegidoCentavos)}</span>
              </p>
              <p className="text-sm text-texto-sec">
                Para vivir: <span className="font-display text-primario">$ {formatCentavos(montoParaVivir)}</span>{" "}
                en {semanasFinal} {semanasFinal === 1 ? "semana" : "semanas"} (${" "}
                {formatCentavos(porSemana)}/sem)
              </p>
            </HudCard>

            <div className="flex gap-3">
              <HudButton variante="fantasma" onClick={() => setPaso(3)} className="grow" disabled={enviando}>
                Atrás
              </HudButton>
              <HudButton onClick={() => void confirmar()} className="grow" disabled={enviando}>
                {enviando ? "Activando…" : "Activar plan"}
              </HudButton>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
