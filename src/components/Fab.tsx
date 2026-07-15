import { Plus } from "lucide-react";

/** Elemento firma #8: FAB magenta angular, siempre visible. */
export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Registrar gasto"
      className="fixed bottom-6 right-5 z-30 w-16 h-16 clip-corner bg-secundario
                 glow-magenta flex items-center justify-center
                 active:scale-90 transition-transform"
    >
      <Plus size={30} className="text-fondo" strokeWidth={3} />
    </button>
  );
}
