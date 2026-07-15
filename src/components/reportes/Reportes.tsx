import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sheet } from "@/components/ui/Sheet";
import { formatCentavos } from "@/lib/money";
import { hoyISO } from "@/lib/dates";
import { gastoPorCategoriaDelMes, gastoPorDiaDelMes } from "@/services/reportes";

/** Espejo de los tokens de src/index.css: recharts necesita colores literales, no CSS vars. */
const COLORES_HEX: Record<string, string> = {
  primario: "#5FD6A8",
  secundario: "#F2A765",
  exito: "#8FD97E",
  alerta: "#F0B955",
  peligro: "#EA8188",
};

function colorHex(color: string): string {
  return COLORES_HEX[color] ?? "#5FD6A8";
}

const TOOLTIP_ESTILO = {
  background: "#0B1A16",
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: 12,
  fontSize: 12,
  color: "#F2F7F2",
};

export function Reportes({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const hoy = hoyISO();
  const porCategoria = useLiveQuery(() => gastoPorCategoriaDelMes(hoy), [hoy]);
  const porDia = useLiveQuery(() => gastoPorDiaDelMes(hoy), [hoy]);

  const totalMes = useMemo(
    () => (porCategoria ?? []).reduce((s, c) => s + c.totalUsdCentavos, 0),
    [porCategoria],
  );

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo="Reportes" alto="full">
      <div className="flex flex-col gap-6">
        <div>
          <p className="font-display text-[10px] tracking-[0.25em] text-texto-sec uppercase mb-2">
            Gasto por categoría · este mes
          </p>
          {!porCategoria || porCategoria.length === 0 ? (
            <p className="text-texto-sec text-sm">Sin gastos este mes todavía.</p>
          ) : (
            <>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={porCategoria}
                      dataKey="totalUsdCentavos"
                      nameKey="nombre"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {porCategoria.map((c, i) => (
                        <Cell key={i} fill={colorHex(c.color)} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_ESTILO}
                      formatter={(v) => `$ ${formatCentavos(Number(v))}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex flex-col gap-1.5 mt-2">
                {porCategoria.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ background: COLORES_HEX[c.color] ?? COLORES_HEX.primario }}
                    />
                    <span className="text-texto grow truncate">{c.nombre}</span>
                    <span className="font-display text-texto-sec shrink-0">
                      $ {formatCentavos(c.totalUsdCentavos)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-texto-sec mt-2">
                Total: <span className="font-display text-texto">$ {formatCentavos(totalMes)}</span>
              </p>
            </>
          )}
        </div>

        <div>
          <p className="font-display text-[10px] tracking-[0.25em] text-texto-sec uppercase mb-2">
            Gasto por día · este mes
          </p>
          {!porDia || porDia.every((d) => d.totalUsdCentavos === 0) ? (
            <p className="text-texto-sec text-sm">Sin gastos este mes todavía.</p>
          ) : (
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={porDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    tick={{ fill: "#B7C9BE", fontSize: 10 }}
                    interval={4}
                    axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={TOOLTIP_ESTILO}
                    labelFormatter={(dia) => `Día ${dia}`}
                    formatter={(v) => `$ ${formatCentavos(Number(v))}`}
                  />
                  <Bar dataKey="totalUsdCentavos" radius={[4, 4, 0, 0]}>
                    {porDia.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.hormigaUsdCentavos > 0 ? colorHex("alerta") : colorHex("primario")}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-[11px] text-texto-sec mt-1">
            Barras ámbar: días con al menos un gasto hormiga.
          </p>
        </div>
      </div>
    </Sheet>
  );
}
