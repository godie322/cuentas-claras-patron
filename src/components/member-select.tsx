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

  return (
    <Select
      value={value}
      onValueChange={(v) => { if (v !== null) onChange(v); }}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
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
