import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil } from "lucide-react";
import { db, type TipoCuenta } from "@/db/schema";
import { formatMonto, parseToCentavos, type Moneda } from "@/lib/money";
import { ajustarBalanceCuenta, crearCuenta } from "@/services/accounts";
import { Sheet } from "@/components/ui/Sheet";
import { HudButton } from "@/components/ui/HudButton";
import { HudCard } from "@/components/ui/HudCard";
import { MonedaToggle } from "@/components/ui/MonedaToggle";
import { glassInput } from "@/lib/utils";

const TIPOS: { valor: TipoCuenta; etiqueta: string }[] = [
  { valor: "efectivo_bs", etiqueta: "Efectivo Bs" },
  { valor: "efectivo_usd", etiqueta: "Efectivo USD" },
  { valor: "banco_bs", etiqueta: "Banco Bs" },
  { valor: "banco_divisas", etiqueta: "Banco divisas" },
  { valor: "binance", etiqueta: "Binance" },
  { valor: "zelle", etiqueta: "Zelle" },
  { valor: "otro", etiqueta: "Otro" },
];

export function Cuentas({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const cuentas = useLiveQuery(
    async () => (await db.accounts.toArray()).filter((a) => a.activa),
    [],
  );

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [ajusteValor, setAjusteValor] = useState("");

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoCuenta>("efectivo_bs");
  const [moneda, setMoneda] = useState<Moneda>("VES");
  const [balanceInicial, setBalanceInicial] = useState("");

  function empezarAjuste(cuentaId: number, actualCentavos: number) {
    setEditandoId(cuentaId);
    setAjusteValor((actualCentavos / 100).toFixed(2).replace(".", ","));
  }

  async function confirmarAjuste(cuentaId: number) {
    const nuevo = parseToCentavos(ajusteValor);
    await ajustarBalanceCuenta(cuentaId, nuevo);
    setEditandoId(null);
    setAjusteValor("");
  }

  async function agregarCuenta() {
    if (nombre.trim() === "") return;
    await crearCuenta({
      nombre: nombre.trim(),
      tipo,
      moneda,
      balance_inicial_centavos: parseToCentavos(balanceInicial),
    });
    setNombre("");
    setBalanceInicial("");
  }

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo="Cuentas">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {(cuentas ?? []).map((c) => (
            <HudCard key={c.id} innerClassName="p-3 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="grow min-w-0">
                  <p className="text-sm text-texto truncate">{c.nombre}</p>
                  <p className="text-[11px] text-texto-sec truncate">
                    {TIPOS.find((t) => t.valor === c.tipo)?.etiqueta ?? c.tipo}
                  </p>
                </div>
                <span className="font-display text-sm text-texto shrink-0">
                  {formatMonto(c.balance_actual_centavos, c.moneda)}
                </span>
                <button
                  onClick={() => empezarAjuste(c.id!, c.balance_actual_centavos)}
                  aria-label="Ajustar saldo"
                  className="text-texto-sec active:scale-90 transition-transform shrink-0"
                >
                  <Pencil size={16} />
                </button>
              </div>
              {editandoId === c.id && (
                <div className="flex items-center gap-2">
                  <input
                    inputMode="decimal"
                    autoFocus
                    value={ajusteValor}
                    onChange={(e) => setAjusteValor(e.target.value)}
                    className={glassInput}
                  />
                  <HudButton onClick={() => void confirmarAjuste(c.id!)} className="shrink-0">
                    Ok
                  </HudButton>
                </div>
              )}
            </HudCard>
          ))}
        </div>

        <div className="border-t border-borde pt-4 flex flex-col gap-3">
          <p className="text-xs text-texto-sec font-display tracking-wider uppercase">
            Nueva cuenta
          </p>
          <input
            placeholder="Nombre (ej. Banesco)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={glassInput}
          />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoCuenta)}
            className={glassInput}
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-3">
            <input
              inputMode="decimal"
              placeholder="Balance inicial"
              value={balanceInicial}
              onChange={(e) => setBalanceInicial(e.target.value)}
              className={glassInput}
            />
            <MonedaToggle value={moneda} onChange={setMoneda} />
          </div>
          <HudButton onClick={() => void agregarCuenta()} disabled={nombre.trim() === ""}>
            Agregar cuenta
          </HudButton>
        </div>
      </div>
    </Sheet>
  );
}
