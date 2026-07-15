import { Sheet } from "@/components/ui/Sheet";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { formatCentavos, formatMonto } from "@/lib/money";
import type { Category } from "@/db/schema";
import type { ResumenHormigas } from "@/services/hormigas";

export function HormigasDetalle({
  abierto,
  onCerrar,
  hormigas,
  categorias,
}: {
  abierto: boolean;
  onCerrar: () => void;
  hormigas: ResumenHormigas;
  categorias: Map<number, Category>;
}) {
  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo="Gastos hormiga">
      <p className="text-sm text-texto-sec mb-1.5">
        Este mes:{" "}
        <span className="font-display text-alerta">
          {hormigas.cantidad} {hormigas.cantidad === 1 ? "gasto pequeño" : "gastos pequeños"} = ${" "}
          {formatCentavos(hormigas.totalUsdCentavos)}
        </span>
      </p>
      {hormigas.cantidad > 0 && (
        <p className="text-sm text-texto-sec mb-3">
          A este ritmo, terminás el mes con{" "}
          <span className="font-display text-alerta">
            ≈ $ {formatCentavos(hormigas.proyeccionMesUsdCentavos)}
          </span>{" "}
          en hormigas.
        </p>
      )}
      <ul>
        {hormigas.transacciones.map((t) => {
          const cat = t.categoria_id !== null ? categorias.get(t.categoria_id) : undefined;
          return (
            <li key={t.id} className="flex items-center gap-3 py-2.5 border-t border-borde">
              <CategoryIcon icono={cat?.icono ?? ""} color={cat?.color ?? "alerta"} size={18} />
              <div className="grow min-w-0">
                <p className="text-sm text-texto truncate">{cat?.nombre ?? "—"}</p>
                <p className="text-[10px] text-texto-sec font-display">{t.fecha.slice(0, 10)}</p>
              </div>
              <span className="font-display text-sm text-texto shrink-0">
                {formatMonto(t.monto_centavos, t.moneda)}
              </span>
            </li>
          );
        })}
      </ul>
      {hormigas.cantidad === 0 && (
        <p className="text-texto-sec text-sm">Sin hormigas este mes. Impecable. 🟢</p>
      )}
    </Sheet>
  );
}
