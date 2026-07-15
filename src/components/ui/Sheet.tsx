import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bottom sheet del HUD. Animación solo transform/opacity (60fps). */
export function Sheet({
  abierto,
  onCerrar,
  titulo,
  children,
  alto = "auto",
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  alto?: "auto" | "full";
}) {
  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-40">
          <motion.div
            className="absolute inset-0 bg-[#06120e]/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCerrar}
          />
          <motion.div
            className={cn(
              "absolute inset-x-0 bottom-0 glass rounded-t-3xl rounded-b-none",
              alto === "full" ? "top-6" : "max-h-[92dvh]",
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="font-display text-sm tracking-[0.2em] uppercase text-primario">
                  {titulo}
                </h2>
                <button
                  onClick={onCerrar}
                  aria-label="Cerrar"
                  className="text-texto-sec p-1 active:scale-90 transition-transform"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto px-4 pb-6 safe-bottom grow">
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
