import { useState } from "react";
import { addDias, hoyISO } from "@/lib/dates";
import { formatCentavos, parseToCentavos } from "@/lib/money";
import { crearSobreManual } from "@/services/envelopes";
import { Sheet } from "@/components/ui/Sheet";
import { HudButton } from "@/components/ui/HudButton";
import { glassInput } from "@/lib/utils";

/**
 * Fase 1: creación manual y simple del sobre semanal.
 * (El payday wizard completo llega en Fase 2.)
 */
export function CrearSobre({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [monto, setMonto] = useState("");
  const [inicio, setInicio] = useState(hoyISO());
  const [dias, setDias] = useState(7);

  const centavos = parseToCentavos(monto);
  const porDia = dias > 0 ? Math.floor(centavos / dias) : 0;

  async function crear() {
    if (centavos <= 0 || dias < 1) return;
    await crearSobreManual({
      monto_asignado_usd_centavos: centavos,
      fecha_inicio: inicio,
      fecha_fin: addDias(inicio, dias - 1),
    });
    setMonto("");
    onCerrar();
  }

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo="Sobre semanal">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
            Monto para vivir (USD)
          </span>
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={glassInput}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
              Desde
            </span>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className={glassInput}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
              Días
            </span>
            <input
              type="number"
              min={1}
              max={31}
              value={dias}
              onChange={(e) => setDias(Math.max(1, Number(e.target.value) || 1))}
              className={glassInput}
            />
          </label>
        </div>

        {centavos > 0 && (
          <p className="text-sm text-texto-sec">
            Tu día será de{" "}
            <span className="font-display text-primario">$ {formatCentavos(porDia)}</span>
          </p>
        )}

        <HudButton onClick={() => void crear()} disabled={centavos <= 0}>
          Activar sobre
        </HudButton>
      </div>
    </Sheet>
  );
}
