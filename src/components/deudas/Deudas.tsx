import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CircleCheck } from "lucide-react";
import { db } from "@/db/schema";
import { formatCentavos, formatMonto, parseToCentavos, usdToVesCentavos, vesToUsdCentavos, type Moneda } from "@/lib/money";
import { crearDeuda, pagarDeuda } from "@/services/debts";
import { useSettings } from "@/hooks/useSettings";
import { useTasaVigente } from "@/hooks/useTasaVigente";
import { Sheet } from "@/components/ui/Sheet";
import { HudButton } from "@/components/ui/HudButton";
import { HudCard } from "@/components/ui/HudCard";
import { MonedaToggle } from "@/components/ui/MonedaToggle";
import { glassInput } from "@/lib/utils";

export function Deudas({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const settings = useSettings();
  const tasaVigente = useTasaVigente();
  const tasa = tasaVigente?.tasaX10000 ?? 0;
  const [descripcion, setDescripcion] = useState("");
  const [acreedor, setAcreedor] = useState("");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<Moneda>("VES");
  const [fechaLimite, setFechaLimite] = useState("");

  const pendientes = useLiveQuery(
    () => db.debts.where("estado").equals("pendiente").toArray(),
    [],
  );
  const cuentas = useLiveQuery(
    async () => (await db.accounts.toArray()).filter((a) => a.activa),
    [],
  );

  const centavos = parseToCentavos(monto);

  async function agregar() {
    if (centavos <= 0 || descripcion.trim() === "") return;
    await crearDeuda({
      descripcion: descripcion.trim(),
      acreedor: acreedor.trim(),
      monto_centavos: centavos,
      moneda,
      fecha_limite: fechaLimite || null,
    });
    setDescripcion("");
    setAcreedor("");
    setMonto("");
    setFechaLimite("");
  }

  async function pagar(deudaId: number) {
    await pagarDeuda(deudaId, settings?.cuenta_default_id ?? null);
  }

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo="Deudas">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {(pendientes ?? []).length === 0 && (
            <p className="text-texto-sec text-sm">Sin deudas pendientes. 🟢</p>
          )}
          {(pendientes ?? []).map((d) => (
            <HudCard key={d.id} innerClassName="p-3 flex items-center gap-3">
              <div className="grow min-w-0">
                <p className="text-sm text-texto truncate">{d.descripcion}</p>
                <p className="text-[11px] text-texto-sec truncate">
                  {d.acreedor}
                  {d.fecha_limite ? ` · vence ${d.fecha_limite}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-sm text-texto">
                  {formatMonto(d.monto_centavos, d.moneda)}
                </p>
                {tasa > 0 && (
                  <p className="font-display text-[10px] text-texto-sec">
                    {d.moneda === "VES"
                      ? `≈ $ ${formatCentavos(vesToUsdCentavos(d.monto_centavos, tasa))}`
                      : `≈ Bs ${formatCentavos(usdToVesCentavos(d.monto_centavos, tasa))}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => void pagar(d.id!)}
                aria-label="Marcar pagada"
                className="text-exito active:scale-90 transition-transform shrink-0"
              >
                <CircleCheck size={22} />
              </button>
            </HudCard>
          ))}
        </div>

        <div className="border-t border-borde pt-4 flex flex-col gap-3">
          <p className="text-xs text-texto-sec font-display tracking-wider uppercase">
            Nueva deuda
          </p>
          <input
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={glassInput}
          />
          <input
            placeholder="Acreedor"
            value={acreedor}
            onChange={(e) => setAcreedor(e.target.value)}
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
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
              Fecha límite (opcional)
            </span>
            <input
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
              className={glassInput}
            />
          </label>
          <HudButton
            onClick={() => void agregar()}
            disabled={centavos <= 0 || descripcion.trim() === ""}
          >
            Agregar deuda
          </HudButton>
        </div>

        {(cuentas ?? []).length === 0 && (
          <p className="text-[11px] text-alerta">
            Sin cuenta activa configurada: el pago se registrará sin cuenta de origen.
          </p>
        )}
      </div>
    </Sheet>
  );
}
