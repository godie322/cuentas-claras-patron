"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
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
import {
  ElectricityBillPanel,
  type ElectricityBillData,
} from "@/components/electricity-bill-panel";
import { createExpense } from "@/lib/data/expenses";
import { uploadReceipts } from "@/lib/supabase/storage";
import type { Member, RecurringExpense } from "@/types/database";

const OTHER_VALUE = "__other__";

const SPLIT_LABELS: Record<string, string> = {
  equal: "Partes iguales",
  custom: "Montos personalizados",
  sole: "Un solo miembro",
};

interface ExpenseFormProps {
  members: Member[];
  recurringExpenses: RecurringExpense[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExpenseForm({ members, recurringExpenses, onSuccess, onCancel }: ExpenseFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const [descriptionSource, setDescriptionSource] = useState<string>(
    recurringExpenses.length > 0 ? recurringExpenses[0].id : OTHER_VALUE
  );
  const [description, setDescription] = useState(
    recurringExpenses.length > 0 ? recurringExpenses[0].name : ""
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [paidBy, setPaidBy] = useState(members[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "custom" | "sole">("equal");
  const [splits, setSplits] = useState<SplitEntry[]>([]);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [electricityBill, setElectricityBill] =
    useState<ElectricityBillData | null>(null);
  const prevReceiptCount = useRef(0);

  const totalAmount = parseFloat(amount) || 0;

  async function handleReceiptChange(files: File[]) {
    setReceiptFiles(files);

    // If a file was removed and we had an electricity bill detected, reset it
    if (files.length < prevReceiptCount.current && electricityBill !== null) {
      setElectricityBill(null);
      setSplits([]);
    }

    // Only attempt extraction when a new file was added and amount is still empty
    if (files.length > prevReceiptCount.current && amount === "") {
      const lastFile = files[files.length - 1];
      prevReceiptCount.current = files.length;
      setExtracting(true);
      try {
        const fd = new FormData();
        fd.append("file", lastFile);

        if (lastFile.type === "application/pdf") {
          // Use richer bill extraction for PDFs — detects electricity bills
          const res = await fetch("/api/extract-bill", {
            method: "POST",
            body: fd,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.bill_type === "electricity") {
              setElectricityBill(data as ElectricityBillData);
              setAmount(String(data.total_amount));
              setSplitType("custom");
            } else if (data.amount !== null && data.amount !== undefined) {
              setAmount(String(data.amount));
            }
          }
        } else {
          // Image → simple amount extraction
          const res = await fetch("/api/extract-amount", {
            method: "POST",
            body: fd,
          });
          if (res.ok) {
            const { amount: extracted } = await res.json();
            if (extracted !== null) {
              setAmount(String(extracted));
            }
          }
        }
      } catch {
        // Silently fail — extraction is best-effort
      } finally {
        setExtracting(false);
      }
    } else {
      prevReceiptCount.current = files.length;
    }
  }

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
      const receipt_urls = receiptFiles.length
        ? await uploadReceipts(receiptFiles, "expenses")
        : undefined;
      await createExpense(
        {
          description,
          total_amount: totalAmount,
          date,
          paid_by: paidBy,
          notes: notes || undefined,
          split_type: splitType === "sole" ? "custom" : splitType,
          created_by: paidBy,
          receipt_urls,
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
      {/* Description */}
      <div className="space-y-1">
        <Label>Descripción *</Label>
        {recurringExpenses.length > 0 ? (
          <div className="space-y-2">
            <Select
              value={descriptionSource}
              onValueChange={(v) => {
                if (!v) return;
                setDescriptionSource(v);
                if (v !== OTHER_VALUE) {
                  const item = recurringExpenses.find((r) => r.id === v);
                  setDescription(item?.name ?? "");
                } else {
                  setDescription("");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue>
                  {descriptionSource === OTHER_VALUE
                    ? "Otro"
                    : (recurringExpenses.find((r) => r.id === descriptionSource)?.name ?? "Seleccionar...")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {recurringExpenses.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
                <SelectItem value={OTHER_VALUE}>Otro</SelectItem>
              </SelectContent>
            </Select>
            {descriptionSource === OTHER_VALUE && (
              <Input
                placeholder="Ej: Combustible tractor"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                autoFocus
              />
            )}
          </div>
        ) : (
          <Input
            placeholder="Ej: Combustible tractor"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        )}
      </div>

      {/* Receipt — shown first so AI can pre-fill the amount */}
      <div className="space-y-1">
        <Label>Comprobante</Label>
        <ReceiptUpload onChange={handleReceiptChange} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Amount */}
        <div className="space-y-1">
          <Label>Monto total *</Label>
          <div className="relative">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={extracting}
              required
            />
            {extracting && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <Label>Fecha *</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Paid by */}
        <div className="col-span-2 space-y-1">
          <Label>Pagado por *</Label>
          <MemberSelect members={members} value={paidBy} onChange={setPaidBy} />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label>Notas</Label>
        <Textarea
          placeholder="Descripción adicional..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Split — electricity mode or manual */}
      {electricityBill ? (
        <ElectricityBillPanel
          members={members}
          billData={electricityBill}
          onSplitChange={(newSplits, total) => {
            setSplits(newSplits);
            setAmount(String(total));
          }}
        />
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label>División</Label>
            <Select
              value={splitType}
              onValueChange={(v) => {
                if (v) setSplitType(v as "equal" | "custom" | "sole");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{SPLIT_LABELS[splitType]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Partes iguales</SelectItem>
                <SelectItem value="custom">Montos personalizados</SelectItem>
                <SelectItem value="sole">Un solo miembro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SplitInput
            members={members}
            total={totalAmount}
            splitType={splitType}
            value={splits}
            onChange={setSplits}
          />
        </div>
      )}

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
