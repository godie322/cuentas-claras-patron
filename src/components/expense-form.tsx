"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberSelect } from "@/components/member-select";
import { SplitInput, type SplitEntry } from "@/components/split-input";
import { ReceiptUpload } from "@/components/receipt-upload";
import { createExpense, EXPENSE_CATEGORIES } from "@/lib/data/expenses";
import { uploadReceipt } from "@/lib/supabase/storage";
import type { Member } from "@/types/database";

interface ExpenseFormProps {
  members: Member[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExpenseForm({ members, onSuccess, onCancel }: ExpenseFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [paidBy, setPaidBy] = useState(members[0]?.id ?? "");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [splits, setSplits] = useState<SplitEntry[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const totalAmount = parseFloat(amount) || 0;

  if (members.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Primero agregá miembros desde la pestaña <strong>Miembros</strong>.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description || totalAmount <= 0 || !paidBy) {
      toast.error("Completá los campos obligatorios");
      return;
    }
    if (splits.length === 0) {
      toast.error("Configurá cómo se divide el gasto");
      return;
    }
    const splitTotal = splits.reduce((s, sp) => s + sp.amount, 0);
    if (Math.abs(splitTotal - totalAmount) > 0.01) {
      toast.error("Los montos asignados no coinciden con el total");
      return;
    }

    setLoading(true);
    try {
      let receipt_url: string | undefined;
      if (receiptFile) {
        receipt_url = await uploadReceipt(receiptFile, "expenses");
      }
      await createExpense(
        {
          description,
          total_amount: totalAmount,
          date,
          paid_by: paidBy,
          category: category || undefined,
          notes: notes || undefined,
          split_type: splitType,
          created_by: paidBy,
          receipt_url,
        },
        splits
      );
      toast.success("Gasto cargado");
      onSuccess();
    } catch (err) {
      toast.error("Error al guardar el gasto");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label>Descripción *</Label>
          <Input
            placeholder="Ej: Combustible tractor"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label>Monto total *</Label>
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

        <div className="space-y-1">
          <Label>Pagado por *</Label>
          <MemberSelect members={members} value={paidBy} onChange={setPaidBy} />
        </div>

        <div className="space-y-1">
          <Label>Categoría</Label>
          <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Notas</Label>
        <Textarea
          placeholder="Descripción adicional..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Comprobante</Label>
        <ReceiptUpload onFileSelect={setReceiptFile} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Label>División del gasto</Label>
          <Select
            value={splitType}
            onValueChange={(v) => { if (v) setSplitType(v as "equal" | "custom"); }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equal">Partes iguales</SelectItem>
              <SelectItem value="custom">Montos personalizados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {totalAmount > 0 && (
          <SplitInput
            members={members}
            total={totalAmount}
            splitType={splitType}
            value={splits}
            onChange={setSplits}
          />
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar gasto"}
        </Button>
      </div>
    </form>
  );
}
