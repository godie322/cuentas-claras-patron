"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import type { Member } from "@/types/database";
import type { SplitEntry } from "@/components/split-input";

export interface ElectricityBillData {
  unit_price: number;
  total_charges: number;
  total_kwh: number;
  total_amount: number;
}

interface Props {
  members: Member[];
  billData: ElectricityBillData;
  onSplitChange: (splits: SplitEntry[], total: number) => void;
}

export function ElectricityBillPanel({ members, billData, onSplitChange }: Props) {
  const [readings, setReadings] = useState<Record<string, string>>(
    () => Object.fromEntries(members.map((m) => [m.id, ""]))
  );

  const { unit_price, total_charges, total_kwh, total_amount } = billData;
  const n = members.length || 1;

  // Derived values
  const indivKwh = members.map((m) => parseFloat(readings[m.id] || "0") || 0);
  const sumIndiv = indivKwh.reduce((a, b) => a + b, 0);
  const commonKwh = Math.max(0, total_kwh - sumIndiv);
  const commonPerPerson = (commonKwh * unit_price) / n;
  const chargesPerPerson = total_charges / n;

  // Stable onSplitChange ref to avoid dep-array noise
  const onSplitChangeRef = useRef(onSplitChange);
  onSplitChangeRef.current = onSplitChange;

  useEffect(() => {
    const rawAmounts = members.map((_, i) =>
      indivKwh[i] * unit_price + commonPerPerson + chargesPerPerson
    );
    const rawTotal = rawAmounts.reduce((a, b) => a + b, 0);
    // Distribute rounding difference to first member
    const diff = Math.round((total_amount - rawTotal) * 100) / 100;

    const splits: SplitEntry[] = rawAmounts.map((amt, i) => ({
      member_id: members[i].id,
      amount: Math.round((amt + (i === 0 ? diff : 0)) * 100) / 100,
    }));

    onSplitChangeRef.current(splits, total_amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings, unit_price, total_charges, total_kwh, total_amount]);

  return (
    <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
        ⚡ Factura eléctrica detectada
      </div>

      {/* Bill summary */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="space-y-0.5">
          <div className="text-xs text-muted-foreground">Consumo total</div>
          <div className="font-medium">{total_kwh} kWh</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-xs text-muted-foreground">Precio/kWh</div>
          <div className="font-medium">${unit_price.toFixed(2)}</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-xs text-muted-foreground">Cargos e impuestos</div>
          <div className="font-medium">{formatCurrency(total_charges)}</div>
        </div>
      </div>

      {/* Individual meter readings */}
      <div className="space-y-2">
        <Label className="text-sm">
          Lectura de medidores — kWh del período (dejá en 0 si no tiene medidor
          propio)
        </Label>
        {members.map((m, i) => {
          const kwh = indivKwh[i];
          const personTotal = kwh * unit_price + commonPerPerson + chargesPerPerson;
          return (
            <div key={m.id} className="flex items-center gap-2">
              <span className="w-20 shrink-0 truncate text-sm font-medium">
                {m.name}
              </span>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className="w-28"
                value={readings[m.id]}
                onChange={(e) =>
                  setReadings((prev) => ({ ...prev, [m.id]: e.target.value }))
                }
              />
              <span className="text-xs text-muted-foreground">kWh</span>
              <span className="ml-auto text-sm font-medium tabular-nums">
                {formatCurrency(personTotal)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Common area and charges breakdown */}
      <div className="space-y-0.5 rounded bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <div>
          Uso común:{" "}
          <strong>
            {commonKwh.toFixed(0)} kWh × ${unit_price.toFixed(2)} ={" "}
            {formatCurrency(commonKwh * unit_price)}
          </strong>
          {n > 1 && (
            <>
              {" "}
              → <strong>{formatCurrency(commonPerPerson)}</strong> c/u
            </>
          )}
        </div>
        <div>
          Cargos e impuestos:{" "}
          <strong>{formatCurrency(total_charges)}</strong>
          {n > 1 && (
            <>
              {" "}
              → <strong>{formatCurrency(chargesPerPerson)}</strong> c/u
            </>
          )}
        </div>
      </div>
    </div>
  );
}
