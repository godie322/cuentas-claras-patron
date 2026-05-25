"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Member } from "@/types/database";
import { formatCurrency } from "@/lib/format";

export interface SplitEntry {
  member_id: string;
  amount: number;
}

interface SplitInputProps {
  members: Member[];
  total: number;
  splitType: "equal" | "custom" | "sole";
  value: SplitEntry[];
  onChange: (splits: SplitEntry[]) => void;
}

export function SplitInput({
  members,
  total,
  splitType,
  value,
  onChange,
}: SplitInputProps) {
  const [localSplits, setLocalSplits] = useState<SplitEntry[]>(() =>
    members.map((m) => ({ member_id: m.id, amount: 0 }))
  );
  const [soleMemberId, setSoleMemberId] = useState("");

  // ── Equal mode: recalculate on total / members change ──────────────────────
  useEffect(() => {
    if (splitType !== "equal") return;
    if (total <= 0 || members.length === 0) return;
    const perPerson = Math.round((total / members.length) * 100) / 100;
    const splits = members.map((m, i) => ({
      member_id: m.id,
      amount:
        i === members.length - 1
          ? Math.round((total - perPerson * (members.length - 1)) * 100) / 100
          : perPerson,
    }));
    setLocalSplits(splits);
    onChange(splits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitType, total, members.length]);

  // ── Custom mode: initialise entries when switching ─────────────────────────
  useEffect(() => {
    if (splitType !== "custom") return;
    setLocalSplits((prev) => {
      const byId = new Map(prev.map((s) => [s.member_id, s.amount]));
      return members.map((m) => ({
        member_id: m.id,
        amount: byId.get(m.id) ?? 0,
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitType, members.length]);

  // ── Sole mode: reset selection when switching into sole ────────────────────
  useEffect(() => {
    if (splitType !== "sole") return;
    setSoleMemberId("");
    onChange([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitType]);

  // ── Sole mode: sync splits whenever selected member or total changes ───────
  useEffect(() => {
    if (splitType !== "sole" || !soleMemberId || total <= 0) return;
    onChange([{ member_id: soleMemberId, amount: total }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soleMemberId, total, splitType]);

  function handleCustomChange(memberId: string, raw: string) {
    const amount = parseFloat(raw) || 0;
    const updated = localSplits.map((s) =>
      s.member_id === memberId ? { ...s, amount } : s
    );
    setLocalSplits(updated);
    onChange(updated);
  }

  // ── Equal mode ─────────────────────────────────────────────────────────────
  if (splitType === "equal") {
    return (
      <div className="rounded-md border p-3 space-y-1 text-sm">
        {members.map((m) => {
          const split = localSplits.find((s) => s.member_id === m.id);
          return (
            <div key={m.id} className="flex justify-between">
              <span className="text-muted-foreground">{m.name}</span>
              <span className="font-medium">
                {split && total > 0 ? formatCurrency(split.amount) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Sole mode ──────────────────────────────────────────────────────────────
  if (splitType === "sole") {
    return (
      <div className="rounded-md border p-3 space-y-1">
        {members.map((m) => {
          const selected = soleMemberId === m.id;
          return (
            <label
              key={m.id}
              className={`flex items-center gap-3 rounded-md px-2 py-2 cursor-pointer transition-colors select-none ${
                selected
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50 text-foreground"
              }`}
            >
              <input
                type="radio"
                name="sole-member"
                value={m.id}
                checked={selected}
                onChange={() => setSoleMemberId(m.id)}
                className="h-4 w-4 accent-primary shrink-0"
              />
              <span className="text-sm flex-1">{m.name}</span>
              {selected && total > 0 && (
                <span className="text-sm font-semibold">
                  {formatCurrency(total)}
                </span>
              )}
            </label>
          );
        })}
      </div>
    );
  }

  // ── Custom mode ────────────────────────────────────────────────────────────
  const currentTotal = localSplits.reduce((sum, s) => sum + s.amount, 0);
  const diff = Math.abs(currentTotal - total);
  const isBalanced = total > 0 && diff < 0.01;

  return (
    <div className="rounded-md border p-3 space-y-3">
      {members.map((m) => {
        const split = localSplits.find((s) => s.member_id === m.id);
        return (
          <div key={m.id} className="flex items-center gap-3">
            <Label className="w-32 shrink-0 text-sm">{m.name}</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={split?.amount === 0 ? "" : (split?.amount ?? "")}
              onChange={(e) => handleCustomChange(m.id, e.target.value)}
              className="w-36"
            />
          </div>
        );
      })}
      <div className="flex items-center gap-2 pt-1 text-sm border-t">
        <span className="text-muted-foreground">
          Asignado: <strong>{formatCurrency(currentTotal)}</strong>
          {total > 0 && <> / {formatCurrency(total)}</>}
        </span>
        {total > 0 && !isBalanced && currentTotal > 0 && (
          <Badge variant="destructive">
            Falta: {formatCurrency(Math.abs(total - currentTotal))}
          </Badge>
        )}
        {isBalanced && (
          <Badge className="bg-green-600 text-white">Balanceado ✓</Badge>
        )}
      </div>
    </div>
  );
}
