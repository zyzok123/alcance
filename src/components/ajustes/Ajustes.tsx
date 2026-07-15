import { useEffect, useState } from "react";
import { actualizarSettings, useSettings } from "@/hooks/useSettings";
import { formatTasa, parseTasaX10000, parseToCentavos, formatCentavos } from "@/lib/money";
import { APP_VERSION, buscarActualizacion } from "@/services/updates";
import { Sheet } from "@/components/ui/Sheet";
import { HudButton } from "@/components/ui/HudButton";
import { cn } from "@/lib/utils";

export function Ajustes({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const settings = useSettings();
  const [tasa, setTasa] = useState("");
  const [umbral, setUmbral] = useState("");
  const [estadoUpdate, setEstadoUpdate] = useState<"idle" | "buscando" | "aldia" | "hay">("idle");
  const [urlUpdate, setUrlUpdate] = useState<string | null>(null);

  useEffect(() => {
    if (!settings || !abierto) return;
    setTasa(settings.tasa_manual_x10000 > 0 ? formatTasa(settings.tasa_manual_x10000) : "");
    setUmbral(formatCentavos(settings.umbral_hormiga_usd_centavos));
    setEstadoUpdate("idle");
  }, [settings?.id, abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar() {
    const tasaX = parseTasaX10000(tasa);
    const umbralC = parseToCentavos(umbral);
    await actualizarSettings({
      tasa_manual_x10000: tasaX,
      umbral_hormiga_usd_centavos: umbralC > 0 ? umbralC : 300,
    });
    onCerrar();
  }

  async function toggleBajoEstimulo() {
    await actualizarSettings({ modo_bajo_estimulo: !settings?.modo_bajo_estimulo });
  }

  async function chequearUpdate() {
    setEstadoUpdate("buscando");
    const r = await buscarActualizacion();
    if (r) {
      setUrlUpdate(r.url);
      setEstadoUpdate("hay");
    } else {
      setEstadoUpdate("aldia");
    }
  }

  const inputCls =
    "clip-corner-sm bg-superficie px-3 py-3 font-display text-texto w-full outline-none " +
    "focus:bg-borde placeholder:text-texto-sec";

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo="Ajustes">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
            Tasa manual (Bs por 1 USD)
          </span>
          <input
            inputMode="decimal"
            placeholder="ej. 40,00"
            value={tasa}
            onChange={(e) => setTasa(e.target.value)}
            className={inputCls}
          />
          <span className="text-[11px] text-texto-sec">
            Fase 3 traerá tasas automáticas (BCV / paralelo / Binance).
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
            Umbral gasto hormiga (USD)
          </span>
          <input
            inputMode="decimal"
            value={umbral}
            onChange={(e) => setUmbral(e.target.value)}
            className={inputCls}
          />
        </label>

        <button
          onClick={() => void toggleBajoEstimulo()}
          className="clip-corner-sm bg-superficie px-3 py-3 flex items-center justify-between"
        >
          <span className="text-sm text-texto">Modo bajo estímulo</span>
          <span
            className={cn(
              "font-display text-xs tracking-wider",
              settings?.modo_bajo_estimulo ? "text-exito" : "text-texto-sec",
            )}
          >
            {settings?.modo_bajo_estimulo ? "ON" : "OFF"}
          </span>
        </button>

        <HudButton onClick={() => void guardar()}>Guardar</HudButton>

        <div className="border-t border-borde pt-4 flex flex-col gap-2">
          <p className="text-[11px] text-texto-sec font-display">
            Versión: {APP_VERSION}
          </p>
          {estadoUpdate === "hay" && urlUpdate ? (
            <HudButton
              variante="secundario"
              onClick={() => window.open(urlUpdate, "_blank")}
            >
              Descargar nueva versión
            </HudButton>
          ) : (
            <HudButton
              variante="fantasma"
              onClick={() => void chequearUpdate()}
              disabled={estadoUpdate === "buscando"}
            >
              {estadoUpdate === "buscando"
                ? "Buscando…"
                : estadoUpdate === "aldia"
                  ? "Estás al día ✓"
                  : "Buscar actualización"}
            </HudButton>
          )}
        </div>
      </div>
    </Sheet>
  );
}
