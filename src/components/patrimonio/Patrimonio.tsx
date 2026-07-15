import { useLiveQuery } from "dexie-react-hooks";
import { WalletCards } from "lucide-react";
import { HudCard } from "@/components/ui/HudCard";
import { formatCentavos } from "@/lib/money";
import { calcularPatrimonio } from "@/services/patrimonio";

export function Patrimonio({ onTap }: { onTap: () => void }) {
  const patrimonio = useLiveQuery(() => calcularPatrimonio(), []);
  if (!patrimonio) return null;

  const negativo = patrimonio.netoUsdCentavos < 0;

  return (
    <HudCard onClick={onTap} className="cursor-pointer active:scale-[0.99] transition-transform">
      <div className="flex items-center justify-between">
        <span className="font-display text-[10px] tracking-[0.25em] text-texto-sec uppercase flex items-center gap-1.5">
          <WalletCards size={13} /> Patrimonio neto
        </span>
        <span className={`font-display text-lg ${negativo ? "text-peligro" : "text-primario"}`}>
          $ {formatCentavos(patrimonio.netoUsdCentavos)}
        </span>
      </div>
      {patrimonio.deudasUsdCentavos > 0 && (
        <p className="text-[11px] text-texto-sec mt-1">
          $ {formatCentavos(patrimonio.brutoUsdCentavos)} en cuentas − $
          {formatCentavos(patrimonio.deudasUsdCentavos)} en deudas
        </p>
      )}
    </HudCard>
  );
}
