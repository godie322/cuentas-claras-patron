"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Member } from "@/types/database";

interface MemberSelectProps {
  members: Member[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  exclude?: string[];
}

export function MemberSelect({
  members,
  value,
  onChange,
  placeholder = "Seleccionar persona",
  exclude = [],
}: MemberSelectProps) {
  const filtered = members.filter((m) => !exclude.includes(m.id));
  // Base UI resolves the trigger label from ItemText only after the popup
  // has been opened at least once. Passing an explicit child to SelectValue
  // bypasses that lookup and always shows the correct label.
  const label = members.find((m) => m.id === value)?.name ?? placeholder;

  return (
    <Select
      value={value}
      onValueChange={(v) => { if (v !== null) onChange(v); }}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {filtered.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
