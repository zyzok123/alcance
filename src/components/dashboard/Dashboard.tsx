import { Settings2, TriangleAlert } from "lucide-react";
import { formatTasa } from "@/lib/money";
import { useSettings } from "@/hooks/useSettings";
import type { DatosDashboard } from "@/hooks/useDashboard";
import { HudCard } from "@/components/ui/HudCard";
import { HudButton } from "@/components/ui/HudButton";
import { GaugeHero } from "./GaugeHero";
import { EnvelopeBar } from "./EnvelopeBar";
import { HormigaCard } from "./HormigaCard";
import { UltimosMovimientos } from "./UltimosMovimientos";

export function Dashboard({
  datos,
  onAbrirAjustes,
  onAbrirSobre,
  onAbrirHormigas,
}: {
  datos: DatosDashboard;
  onAbrirAjustes: () => void;
  onAbrirSobre: () => void;
  onAbrirHormigas: () => void;
}) {
  const settings = useSettings();
  const lowStim = settings?.modo_bajo_estimulo ?? false;
  const tasa = settings?.tasa_manual_x10000 ?? 0;

  return (
    <div className="min-h-dvh hud-grid-bg safe-top pb-28 px-4 max-w-md mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between py-3">
        <h1 className="font-display font-bold text-lg tracking-[0.35em] text-texto">
          ALCANCE
        </h1>
        <div className="flex items-center gap-3">
          {/* Indicador discreto de tasa */}
          {tasa > 0 ? (
            <span className="font-display text-[10px] text-texto-sec tracking-wider">
              1$ = Bs {formatTasa(tasa)} · manual
            </span>
          ) : (
            <button
              onClick={onAbrirAjustes}
              className="flex items-center gap-1 font-display text-[10px] text-alerta tracking-wider"
            >
              <TriangleAlert size={12} /> CONFIGURA TASA
            </button>
          )}
          <button
            onClick={onAbrirAjustes}
            aria-label="Ajustes"
            className="text-texto-sec active:scale-90 transition-transform"
          >
            <Settings2 size={20} />
          </button>
        </div>
      </header>

      <main className="flex flex-col gap-3">
        {datos.estado ? (
          <>
            <GaugeHero
              presupuestoHoyCentavos={datos.estado.presupuestoHoyUsdCentavos}
              fraccionConsumida={datos.estado.fraccionConsumidaHoy}
              presupuestoMananaCentavos={datos.estado.presupuestoMananaUsdCentavos}
              lowStim={lowStim}
            />
            <EnvelopeBar estado={datos.estado} lowStim={lowStim} />
          </>
        ) : (
          <HudCard className="mt-6" innerClassName="p-6 flex flex-col items-center gap-4 text-center">
            <p className="font-display text-sm tracking-[0.2em] text-texto-sec uppercase">
              Sin sobre activo
            </p>
            <p className="text-sm text-texto-sec">
              Define cuánto tienes para vivir esta semana y Alcance te dice
              cuánto puedes gastar cada día.
            </p>
            <HudButton onClick={onAbrirSobre}>Crear sobre semanal</HudButton>
          </HudCard>
        )}

        <HormigaCard hormigas={datos.hormigas} onTap={onAbrirHormigas} />

        <UltimosMovimientos transacciones={datos.ultimas} categorias={datos.categorias} />
      </main>
    </div>
  );
}
