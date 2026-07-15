import { HudCard } from "@/components/ui/HudCard";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { formatMonto } from "@/lib/money";
import type { Category, Transaction } from "@/db/schema";

export function UltimosMovimientos({
  transacciones,
  categorias,
}: {
  transacciones: Transaction[];
  categorias: Map<number, Category>;
}) {
  if (transacciones.length === 0) return null;
  return (
    <HudCard innerClassName="p-3">
      <span className="font-display text-[10px] tracking-[0.25em] text-texto-sec uppercase block px-1 pb-1">
        Últimos movimientos
      </span>
      <ul>
        {transacciones.map((t) => {
          const cat = t.categoria_id !== null ? categorias.get(t.categoria_id) : undefined;
          return (
            <li key={t.id} className="flex items-center gap-3 px-1 py-2 border-t border-borde">
              <CategoryIcon icono={cat?.icono ?? ""} color={cat?.color ?? "primario"} size={18} />
              <div className="grow min-w-0">
                <p className="text-sm text-texto truncate">{cat?.nombre ?? "—"}</p>
                <p className="text-[10px] text-texto-sec font-display">
                  {t.fecha.slice(5, 10)} · {t.fecha.slice(11, 16)}
                  {t.es_hormiga && <span className="text-alerta"> · hormiga</span>}
                </p>
              </div>
              <span className="font-display text-sm text-texto shrink-0">
                {formatMonto(t.monto_centavos, t.moneda)}
              </span>
            </li>
          );
        })}
      </ul>
    </HudCard>
  );
}
