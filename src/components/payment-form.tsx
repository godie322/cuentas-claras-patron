"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MemberSelect } from "@/components/member-select";
import { ReceiptUpload } from "@/components/receipt-upload";
import { createPayment } from "@/lib/data/payments";
import { uploadReceipt } from "@/lib/supabase/storage";
import type { Member } from "@/types/database";

interface PaymentFormProps {
  members: Member[];
  currentMemberId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentForm({
  members,
  currentMemberId,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const [fromMember, setFromMember] = useState(currentMemberId);
  const [toMember, setToMember] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromMember || !toMember || !amount) {
      toast.error("Completá todos los campos obligatorios");
      return;
    }
    if (fromMember === toMember) {
      toast.error("El pagador y el receptor no pueden ser la misma persona");
      return;
    }

    setLoading(true);
    try {
      let receipt_url: string | undefined;
      if (receiptFile) {
        receipt_url = await uploadReceipt(receiptFile, "payments");
      }
      await createPayment({
        from_member_id: fromMember,
        to_member_id: toMember,
        amount: parseFloat(amount),
        date,
        notes: notes || undefined,
        created_by: currentMemberId,
        receipt_url,
      });
      toast.success("Pago registrado");
      onSuccess();
    } catch (err) {
      toast.error("Error al guardar el pago");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Pagado por *</Label>
          <MemberSelect
            members={members}
            value={fromMember}
            onChange={setFromMember}
            exclude={[toMember]}
          />
        </div>

        <div className="space-y-1">
          <Label>Pagado a *</Label>
          <MemberSelect
            members={members}
            value={toMember}
            onChange={setToMember}
            placeholder="Seleccionar receptor"
            exclude={[fromMember]}
          />
        </div>

        <div className="space-y-1">
          <Label>Monto *</Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label>Fecha *</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Notas</Label>
        <Textarea
          placeholder="Descripción del pago..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Comprobante</Label>
        <ReceiptUpload onFileSelect={setReceiptFile} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Registrar pago"}
        </Button>
      </div>
    </form>
  );
}
