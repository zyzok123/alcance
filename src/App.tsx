import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { useSettings } from "@/hooks/useSettings";
import { useDashboard } from "@/hooks/useDashboard";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { QuickAdd } from "@/components/registro/QuickAdd";
import { CrearSobre } from "@/components/sobre/CrearSobre";
import { Ajustes } from "@/components/ajustes/Ajustes";
import { HormigasDetalle } from "@/components/hormigas/HormigasDetalle";
import { Fab } from "@/components/Fab";

type SheetActivo = null | "add" | "sobre" | "ajustes" | "hormigas";

export default function App() {
  const settings = useSettings();
  const datos = useDashboard();
  const [sheet, setSheet] = useState<SheetActivo>(null);

  const lowStim = settings?.modo_bajo_estimulo ?? false;

  // Modo bajo estímulo: atributo global que apaga glows/animaciones CSS.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-low-stim", lowStim);
  }, [lowStim]);

  if (!datos) {
    return (
      <div className="min-h-dvh flex items-center justify-center hud-grid-bg">
        <p className="font-display text-primario tracking-[0.3em] text-sm">ALCANCE</p>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion={lowStim ? "always" : "never"}>
      <Dashboard
        datos={datos}
        onAbrirAjustes={() => setSheet("ajustes")}
        onAbrirSobre={() => setSheet("sobre")}
        onAbrirHormigas={() => setSheet("hormigas")}
      />

      <Fab onClick={() => setSheet("add")} />

      <QuickAdd abierto={sheet === "add"} onCerrar={() => setSheet(null)} />
      <CrearSobre abierto={sheet === "sobre"} onCerrar={() => setSheet(null)} />
      <Ajustes abierto={sheet === "ajustes"} onCerrar={() => setSheet(null)} />
      <HormigasDetalle
        abierto={sheet === "hormigas"}
        onCerrar={() => setSheet(null)}
        hormigas={datos.hormigas}
        categorias={datos.categorias}
      />
    </MotionConfig>
  );
}
