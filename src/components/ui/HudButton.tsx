import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

const ESTILOS: Record<Variante, string> = {
  primario: "bg-primario text-fondo font-semibold",
  secundario: "bg-secundario text-fondo font-semibold",
  fantasma: "bg-superficie text-texto",
  peligro: "bg-peligro text-fondo font-semibold",
};

export function HudButton({
  variante = "primario",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        "clip-corner-sm px-4 py-3 font-display text-sm tracking-wider uppercase",
        "active:scale-[0.97] transition-transform disabled:opacity-40",
        ESTILOS[variante],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
