import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Card firma del HUD: esquinas cortadas + borde de 1px.
 * Técnica: capa exterior (color de borde) recortada + capa interior
 * recortada con 1px de padding — clip-path no respeta `border`.
 */
export function HudCard({
  children,
  className,
  innerClassName,
  borderClassName,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  borderClassName?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn("clip-corner p-px bg-borde", borderClassName, className)}
      onClick={onClick}
    >
      <div className={cn("clip-corner bg-superficie p-4", innerClassName)}>
        {children}
      </div>
    </div>
  );
}
