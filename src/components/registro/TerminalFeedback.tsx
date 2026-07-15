import { useEffect } from "react";
import { vibrarCorto } from "@/services/haptics";

/**
 * Elemento firma #6: confirmación tipo terminal de 800ms
 * + vibración háptica corta.
 */
export function TerminalFeedback({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    void vibrarCorto();
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fondo/90">
      <div className="clip-corner p-px bg-exito glitch-flash">
        <div className="clip-corner bg-fondo px-8 py-6">
          <p className="font-display text-exito tracking-[0.2em] text-sm">
            TRANSACCIÓN REGISTRADA ✓
          </p>
        </div>
      </div>
    </div>
  );
}
