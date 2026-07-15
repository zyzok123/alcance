import { Fingerprint } from "lucide-react";
import { HudButton } from "@/components/ui/HudButton";

export function PantallaBloqueo({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4 text-center max-w-xs">
        <Fingerprint size={48} className="text-primario" />
        <div>
          <p className="font-display text-sm tracking-[0.2em] uppercase text-texto">
            Alcance bloqueada
          </p>
          <p className="text-sm text-texto-sec mt-1">
            Desbloqueá con tu huella o PIN para ver tus finanzas.
          </p>
        </div>
        <HudButton onClick={onReintentar}>Desbloquear</HudButton>
      </div>
    </div>
  );
}
