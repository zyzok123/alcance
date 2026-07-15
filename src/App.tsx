import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { useSettings } from "@/hooks/useSettings";
import { useDashboard } from "@/hooks/useDashboard";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { QuickAdd } from "@/components/registro/QuickAdd";
import { CrearSobre } from "@/components/sobre/CrearSobre";
import { Ajustes } from "@/components/ajustes/Ajustes";
import { HormigasDetalle } from "@/components/hormigas/HormigasDetalle";
import { Deudas } from "@/components/deudas/Deudas";
import { PaydayWizard } from "@/components/payday/PaydayWizard";
import { Cuentas } from "@/components/cuentas/Cuentas";
import { Recurrentes } from "@/components/recurrentes/Recurrentes";
import { Reportes } from "@/components/reportes/Reportes";
import { Fab } from "@/components/Fab";
import { PantallaBloqueo } from "@/components/bloqueo/PantallaBloqueo";
import { actualizarCacheTasas } from "@/services/tasas";
import { generarPendientes } from "@/services/recurrentes";
import { autenticar } from "@/services/biometria";
import { hoyISO } from "@/lib/dates";

type SheetActivo =
  | null
  | "add"
  | "sobre"
  | "ajustes"
  | "hormigas"
  | "deudas"
  | "pago"
  | "cuentas"
  | "recurrentes"
  | "reportes";

export default function App() {
  const settings = useSettings();
  const datos = useDashboard();
  const [sheet, setSheet] = useState<SheetActivo>(null);
  const [chequeoBloqueoHecho, setChequeoBloqueoHecho] = useState(false);
  const [desbloqueado, setDesbloqueado] = useState(false);

  const lowStim = settings?.modo_bajo_estimulo ?? false;

  // Bloqueo biométrico: se evalúa UNA vez al cargar settings, no en cada
  // cambio (si Ronald lo activa desde Ajustes mid-sesión no debe tirarlo
  // afuera de golpe).
  useEffect(() => {
    if (!settings || chequeoBloqueoHecho) return;
    setChequeoBloqueoHecho(true);
    if (!settings.bloqueo_biometrico_activo) {
      setDesbloqueado(true);
      return;
    }
    void autenticar().then(setDesbloqueado);
  }, [settings, chequeoBloqueoHecho]);

  // Modo bajo estímulo: atributo global que apaga glows/animaciones CSS.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-low-stim", lowStim);
  }, [lowStim]);

  // Refresco de tasas en segundo plano: falla en silencio sin internet.
  useEffect(() => {
    void actualizarCacheTasas();
  }, []);

  // Genera transacciones recurrentes pendientes (mensual/quincenal/semanal) al abrir.
  useEffect(() => {
    void generarPendientes(hoyISO());
  }, []);

  if (!datos) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="glass rounded-full px-6 py-3">
          <p className="font-display text-primario tracking-[0.3em] text-sm">ALCANCE</p>
        </div>
      </div>
    );
  }

  if (settings?.bloqueo_biometrico_activo && !desbloqueado) {
    return (
      <PantallaBloqueo onReintentar={() => void autenticar().then(setDesbloqueado)} />
    );
  }

  return (
    <MotionConfig reducedMotion={lowStim ? "always" : "never"}>
      <Dashboard
        datos={datos}
        onAbrirAjustes={() => setSheet("ajustes")}
        onAbrirSobre={() => setSheet("sobre")}
        onAbrirHormigas={() => setSheet("hormigas")}
        onAbrirDeudas={() => setSheet("deudas")}
        onAbrirPago={() => setSheet("pago")}
        onAbrirCuentas={() => setSheet("cuentas")}
        onAbrirReportes={() => setSheet("reportes")}
      />

      <Fab onClick={() => setSheet("add")} />

      <QuickAdd abierto={sheet === "add"} onCerrar={() => setSheet(null)} />
      <CrearSobre abierto={sheet === "sobre"} onCerrar={() => setSheet(null)} />
      <Ajustes
        abierto={sheet === "ajustes"}
        onCerrar={() => setSheet(null)}
        onAbrirRecurrentes={() => setSheet("recurrentes")}
      />
      <HormigasDetalle
        abierto={sheet === "hormigas"}
        onCerrar={() => setSheet(null)}
        hormigas={datos.hormigas}
        categorias={datos.categorias}
      />
      <Deudas abierto={sheet === "deudas"} onCerrar={() => setSheet(null)} />
      <PaydayWizard abierto={sheet === "pago"} onCerrar={() => setSheet(null)} />
      <Cuentas abierto={sheet === "cuentas"} onCerrar={() => setSheet(null)} />
      <Recurrentes abierto={sheet === "recurrentes"} onCerrar={() => setSheet(null)} />
      <Reportes abierto={sheet === "reportes"} onCerrar={() => setSheet(null)} />
    </MotionConfig>
  );
}
