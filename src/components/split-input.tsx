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
  splitType: "equal" | "custom";
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
  const [localSplits, setLocalSplits] = useState<SplitEntry[]>(value);

  useEffect(() => {
    if (splitType === "equal" && total > 0 && members.length > 0) {
      const perPerson = Math.round((total / members.length) * 100) / 100;
      const splits = members.map((m, i) => ({
        member_id: m.id,
        // last member absorbs rounding difference
        amount:
          i === members.length - 1
            ? Math.round((total - perPerson * (members.length - 1)) * 100) / 100
            : perPerson,
      }));
      setLocalSplits(splits);
      onChange(splits);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitType, total, members.length]);

  function handleCustomChange(memberId: string, raw: string) {
    const amount = parseFloat(raw) || 0;
    const updated = localSplits.map((s) =>
      s.member_id === memberId ? { ...s, amount } : s
    );
    // init missing members
    const ids = updated.map((s) => s.member_id);
    members.forEach((m) => {
      if (!ids.includes(m.id)) updated.push({ member_id: m.id, amount: 0 });
    });
    setLocalSplits(updated);
    onChange(updated);
  }

  const currentTotal = localSplits.reduce((sum, s) => sum + s.amount, 0);
  const diff = Math.abs(currentTotal - total);
  const isBalanced = diff < 0.01;

  if (splitType === "equal") {
    return (
      <div className="space-y-1 text-sm text-muted-foreground">
        {members.map((m) => {
          const split = localSplits.find((s) => s.member_id === m.id);
          return (
            <div key={m.id} className="flex justify-between">
              <span>{m.name}</span>
              <span>{split ? formatCurrency(split.amount) : "-"}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((m) => {
        const split = localSplits.find((s) => s.member_id === m.id);
        return (
          <div key={m.id} className="flex items-center gap-3">
            <Label className="w-32 shrink-0">{m.name}</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={split?.amount ?? ""}
              onChange={(e) => handleCustomChange(m.id, e.target.value)}
              className="w-32"
            />
          </div>
        );
      })}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          Total asignado: {formatCurrency(currentTotal)} / {formatCurrency(total)}
        </span>
        {!isBalanced && (
          <Badge variant="destructive">
            Diferencia: {formatCurrency(diff)}
          </Badge>
        )}
        {isBalanced && total > 0 && (
          <Badge variant="default" className="bg-green-600">
            Balanceado
          </Badge>
        )}
      </div>
    </div>
  );
}
