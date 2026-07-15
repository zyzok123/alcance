import type { Moneda } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Selector Bs/$ compartido: pastilla de vidrio con segmento activo. */
export function MonedaToggle({
  value,
  onChange,
  className,
}: {
  value: Moneda;
  onChange: (m: Moneda) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex glass rounded-full p-1 shrink-0", className)}>
      {(["VES", "USD"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "px-4 py-2 rounded-full font-display text-sm transition-colors",
            value === m ? "bg-primario/90 text-fondo" : "text-texto-sec",
          )}
        >
          {m === "VES" ? "Bs" : "$"}
        </button>
      ))}
    </div>
  );
}
