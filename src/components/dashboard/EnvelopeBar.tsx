import { motion } from "framer-motion";
import { HudCard } from "@/components/ui/HudCard";
import { formatCentavos } from "@/lib/money";
import type { EstadoSobre } from "@/services/envelopes";

/** Color gradual de la barra: verde → ámbar → rojo suave. */
function colorBarra(fraccion: number): string {
  if (fraccion < 0.6) return "var(--color-exito)";
  if (fraccion < 0.85) return "var(--color-alerta)";
  return "var(--color-peligro)";
}

export function EnvelopeBar({ estado, lowStim }: { estado: EstadoSobre; lowStim: boolean }) {
  const pct = estado.fraccionSobre;
  return (
    <HudCard>
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-display text-[10px] tracking-[0.25em] text-texto-sec uppercase">
          Sobre semanal
        </span>
        <span className="font-display text-xs text-texto-sec">
          {estado.diasRestantes} {estado.diasRestantes === 1 ? "día" : "días"} rest.
        </span>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display text-xl text-texto">
          $ {formatCentavos(estado.gastadoUsdCentavos)}
        </span>
        <span className="text-texto-sec text-sm">
          / $ {formatCentavos(estado.sobre.monto_asignado_usd_centavos)}
        </span>
      </div>
      {/* Barra: se anima con scaleX (solo transform, 60fps). */}
      <div className="h-2 bg-borde clip-corner-sm overflow-hidden">
        <motion.div
          className="h-full origin-left"
          style={{ background: colorBarra(pct) }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct }}
          transition={{ duration: lowStim ? 0 : 0.7, ease: "easeOut" }}
        />
      </div>
    </HudCard>
  );
}
