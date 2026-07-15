import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Panel de vidrio (liquid glass): blur + borde translúcido + esquinas suaves. */
export function HudCard({
  children,
  className,
  innerClassName,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn("glass rounded-2xl p-4", className, innerClassName)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
