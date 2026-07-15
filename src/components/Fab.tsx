import { Plus } from "lucide-react";

/** FAB ámbar tipo vidrio, siempre visible. */
export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Registrar gasto"
      className="fixed bottom-6 right-5 z-30 w-16 h-16 rounded-full bg-secundario/90
                 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] glow-secundario
                 flex items-center justify-center
                 active:scale-90 transition-transform"
    >
      <Plus size={30} className="text-fondo" strokeWidth={3} />
    </button>
  );
}
