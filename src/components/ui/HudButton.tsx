import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

const ESTILOS: Record<Variante, string> = {
  primario:
    "bg-primario/90 text-fondo font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_20px_rgba(95,214,168,0.35)]",
  secundario:
    "bg-secundario/90 text-fondo font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_20px_rgba(242,167,101,0.35)]",
  fantasma: "glass text-texto",
  peligro:
    "bg-peligro/90 text-fondo font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_20px_rgba(234,129,136,0.35)]",
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
        "rounded-full px-5 py-3 font-display text-sm tracking-wider uppercase backdrop-blur-md",
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
