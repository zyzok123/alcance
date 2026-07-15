import { Delete } from "lucide-react";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "borrar"] as const;

/** Teclado numérico grande, propio (no el del sistema): velocidad sagrada. */
export function Numpad({
  onTecla,
}: {
  onTecla: (tecla: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TECLAS.map((t) => (
        <button
          key={t}
          onClick={() => onTecla(t)}
          className="rounded-xl border border-borde bg-superficie h-14 font-display text-2xl text-texto
                     active:scale-95 active:bg-white/20 transition-transform
                     flex items-center justify-center"
          aria-label={t === "borrar" ? "Borrar" : t}
        >
          {t === "borrar" ? <Delete size={22} className="text-texto-sec" /> : t}
        </button>
      ))}
    </div>
  );
}

/** Aplica una tecla al string de monto en edición ("12,50"). */
export function aplicarTecla(actual: string, tecla: string): string {
  if (tecla === "borrar") return actual.slice(0, -1);
  if (tecla === ",") {
    if (actual.includes(",")) return actual;
    return actual === "" ? "0," : `${actual},`;
  }
  // dígito
  const [, dec] = actual.split(",");
  if (dec !== undefined && dec.length >= 2) return actual; // máx 2 decimales
  const entero = actual.split(",")[0] ?? "";
  if (dec === undefined && entero.length >= 9) return actual; // tope sano
  if (actual === "0") return tecla; // sin ceros a la izquierda
  return actual + tecla;
}
