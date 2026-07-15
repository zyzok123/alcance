import { HudCard } from "@/components/ui/HudCard";
import { formatCentavos } from "@/lib/money";
import type { ResumenHormigas } from "@/services/hormigas";

const MAX_PUNTOS = 48;

/**
 * Elemento firma #5: puntitos acumulándose — la metáfora literal.
 * Cada punto encendido = una hormiga del mes.
 */
export function HormigaCard({
  hormigas,
  onTap,
}: {
  hormigas: ResumenHormigas;
  onTap: () => void;
}) {
  const encendidos = Math.min(hormigas.cantidad, MAX_PUNTOS);
  return (
    <HudCard onClick={onTap} className="cursor-pointer active:scale-[0.99] transition-transform">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-display text-[10px] tracking-[0.25em] text-texto-sec uppercase">
          Hormigas del mes
        </span>
        <span className="font-display text-xs text-alerta">
          {hormigas.cantidad} = $ {formatCentavos(hormigas.totalUsdCentavos)}
        </span>
      </div>
      <div className="grid grid-cols-16 gap-1.5" style={{ gridTemplateColumns: "repeat(16, 1fr)" }}>
        {Array.from({ length: MAX_PUNTOS }, (_, i) => (
          <span
            key={i}
            className="aspect-square w-full rounded-full"
            style={{
              background: i < encendidos ? "var(--color-alerta)" : "var(--color-borde)",
              opacity: i < encendidos ? 0.9 : 0.5,
            }}
          />
        ))}
      </div>
      {hormigas.cantidad > MAX_PUNTOS && (
        <p className="text-[10px] text-texto-sec mt-1.5 font-display">
          +{hormigas.cantidad - MAX_PUNTOS} más…
        </p>
      )}
    </HudCard>
  );
}
