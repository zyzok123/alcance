import { useEffect, useRef, useState } from "react";
import { animate, motion } from "framer-motion";
import { formatCentavos, usdToVesCentavos } from "@/lib/money";
import { cn } from "@/lib/utils";

const R = 104;
const CIRCUNFERENCIA = 2 * Math.PI * R;

/**
 * Elemento firma #1: el número héroe dentro de un gauge circular SVG
 * que se vacía según el % del presupuesto diario consumido.
 * Count-up animado al montar. Glow cian solo en el arco.
 */
export function GaugeHero({
  presupuestoHoyCentavos,
  fraccionConsumida,
  presupuestoMananaCentavos,
  tasaX10000,
  lowStim,
}: {
  presupuestoHoyCentavos: number;
  fraccionConsumida: number; // 0..1
  presupuestoMananaCentavos: number | null;
  tasaX10000: number;
  lowStim: boolean;
}) {
  const negativo = presupuestoHoyCentavos < 0;
  const restante = negativo ? 0 : 1 - fraccionConsumida;
  const [mostrado, setMostrado] = useState(lowStim ? presupuestoHoyCentavos : 0);
  const previo = useRef(0);

  useEffect(() => {
    if (lowStim) {
      setMostrado(presupuestoHoyCentavos);
      return;
    }
    const controls = animate(previo.current, presupuestoHoyCentavos, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setMostrado(Math.round(v)),
    });
    previo.current = presupuestoHoyCentavos;
    return () => controls.stop();
  }, [presupuestoHoyCentavos, lowStim]);

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-[260px] h-[260px]">
        <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90">
          <circle
            cx="120"
            cy="120"
            r={R}
            fill="none"
            stroke="var(--color-borde)"
            strokeWidth="5"
          />
          <motion.circle
            cx="120"
            cy="120"
            r={R}
            fill="none"
            stroke={negativo ? "var(--color-peligro)" : "var(--color-primario)"}
            strokeWidth="5"
            strokeDasharray={CIRCUNFERENCIA}
            className={negativo ? "" : "glow-primario"}
            initial={{ strokeDashoffset: CIRCUNFERENCIA }}
            animate={{ strokeDashoffset: CIRCUNFERENCIA * (1 - restante) }}
            transition={{ duration: lowStim ? 0 : 0.9, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[10px] tracking-[0.3em] text-texto-sec uppercase">
            Hoy puedes gastar
          </span>
          <span
            className={cn(
              "font-display font-bold text-5xl mt-1",
              negativo ? "text-peligro" : "text-texto",
            )}
          >
            <span className="text-2xl align-top mr-1 text-texto-sec">$</span>
            {formatCentavos(mostrado)}
          </span>
          {tasaX10000 > 0 && mostrado > 0 && (
            <span className="font-display text-xs text-texto-sec mt-0.5">
              ≈ Bs {formatCentavos(usdToVesCentavos(mostrado, tasaX10000))} hoy
            </span>
          )}
        </div>
      </div>
      {negativo && presupuestoMananaCentavos !== null && (
        <p className="text-center text-sm text-texto-sec -mt-3 px-8">
          Te pasaste{" "}
          <span className="text-peligro font-display">
            $ {formatCentavos(-presupuestoHoyCentavos)}
          </span>{" "}
          hoy. Mañana tu día es de{" "}
          <span className="text-texto font-display">
            $ {formatCentavos(Math.max(0, presupuestoMananaCentavos))}
          </span>
          . Seguimos.
        </p>
      )}
    </div>
  );
}
