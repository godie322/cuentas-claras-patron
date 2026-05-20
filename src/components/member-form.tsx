"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMember, updateMember } from "@/lib/data/members";
import type { Member } from "@/types/database";

interface MemberFormProps {
  existing?: Member;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MemberForm({ existing, onSuccess, onCancel }: MemberFormProps) {
  const [name, setName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Nombre y email son obligatorios");
      return;
    }
    setLoading(true);
    try {
      if (existing) {
        await updateMember(existing.id, { name, email, phone: phone || undefined });
        toast.success("Miembro actualizado");
      } else {
        await createMember({ name, email, phone: phone || undefined });
        toast.success("Miembro agregado");
      }
      onSuccess();
    } catch (err) {
      toast.error("Error al guardar");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Nombre *</Label>
        <Input
          placeholder="Nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label>Email *</Label>
        <Input
          type="email"
          placeholder="nombre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label>Teléfono (WhatsApp)</Label>
        <Input
          placeholder="+54911xxxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : existing ? "Actualizar" : "Agregar miembro"}
        </Button>
      </div>
    </form>
  );
}
