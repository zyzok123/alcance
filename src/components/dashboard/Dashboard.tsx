import { BarChart3, CreditCard, Flame, Settings2, TriangleAlert, Wallet, WalletCards } from "lucide-react";
import { formatTasa } from "@/lib/money";
import { useSettings } from "@/hooks/useSettings";
import { useTasaVigente } from "@/hooks/useTasaVigente";
import { etiquetaFuente } from "@/services/tasas";
import type { DatosDashboard } from "@/hooks/useDashboard";
import { HudCard } from "@/components/ui/HudCard";
import { HudButton } from "@/components/ui/HudButton";
import { GaugeHero } from "./GaugeHero";
import { EnvelopeBar } from "./EnvelopeBar";
import { HormigaCard } from "./HormigaCard";
import { UltimosMovimientos } from "./UltimosMovimientos";
import { Patrimonio } from "@/components/patrimonio/Patrimonio";

export function Dashboard({
  datos,
  onAbrirAjustes,
  onAbrirSobre,
  onAbrirHormigas,
  onAbrirDeudas,
  onAbrirPago,
  onAbrirCuentas,
  onAbrirReportes,
}: {
  datos: DatosDashboard;
  onAbrirAjustes: () => void;
  onAbrirSobre: () => void;
  onAbrirHormigas: () => void;
  onAbrirDeudas: () => void;
  onAbrirPago: () => void;
  onAbrirCuentas: () => void;
  onAbrirReportes: () => void;
}) {
  const settings = useSettings();
  const tasaVigente = useTasaVigente();
  const lowStim = settings?.modo_bajo_estimulo ?? false;
  const tasa = tasaVigente?.tasaX10000 ?? 0;

  return (
    <div className="min-h-dvh safe-top pb-28 px-4 max-w-md mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display font-bold text-lg tracking-[0.35em] text-texto">
            ALCANCE
          </h1>
          {datos.racha > 0 && (
            <span className="flex items-center gap-0.5 font-display text-[11px] text-exito">
              <Flame size={13} /> {datos.racha}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Indicador discreto de tasa */}
          {tasa > 0 ? (
            <span className="font-display text-[10px] text-texto-sec tracking-wider">
              1$ = Bs {formatTasa(tasa)} · {etiquetaFuente(tasaVigente?.fuente)}
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
            onClick={onAbrirCuentas}
            aria-label="Cuentas"
            className="text-texto-sec active:scale-90 transition-transform"
          >
            <WalletCards size={20} />
          </button>
          <button
            onClick={onAbrirDeudas}
            aria-label="Deudas"
            className="text-texto-sec active:scale-90 transition-transform"
          >
            <CreditCard size={20} />
          </button>
          <button
            onClick={onAbrirPago}
            aria-label="Nuevo pago"
            className="text-texto-sec active:scale-90 transition-transform"
          >
            <Wallet size={20} />
          </button>
          <button
            onClick={onAbrirReportes}
            aria-label="Reportes"
            className="text-texto-sec active:scale-90 transition-transform"
          >
            <BarChart3 size={20} />
          </button>
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
              tasaX10000={tasa}
              lowStim={lowStim}
            />
            <EnvelopeBar estado={datos.estado} tasaX10000={tasa} lowStim={lowStim} />
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
            <HudButton onClick={onAbrirPago}>Nuevo pago (cobré)</HudButton>
            <button
              onClick={onAbrirSobre}
              className="text-primario font-display text-xs tracking-wider uppercase"
            >
              o crear sobre manual
            </button>
          </HudCard>
        )}

        <Patrimonio onTap={onAbrirCuentas} />

        <HormigaCard hormigas={datos.hormigas} onTap={onAbrirHormigas} />

        <UltimosMovimientos
          transacciones={datos.ultimas}
          categorias={datos.categorias}
          tasaX10000={tasa}
        />
      </main>
    </div>
  );
}
