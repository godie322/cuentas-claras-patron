"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Eye, Pencil, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { ExpenseForm } from "@/components/expense-form";
import { PaymentForm } from "@/components/payment-form";
import { MemberForm } from "@/components/member-form";
import { getMembers, getMemberBalances } from "@/lib/data/members";
import { getExpenses, deleteExpense } from "@/lib/data/expenses";
import { getPayments, deletePayment } from "@/lib/data/payments";
import {
  getRecurringExpenses,
  createRecurringExpense,
  deleteRecurringExpense,
} from "@/lib/data/recurring-expenses";
import {
  formatCurrency,
  formatDate,
  currentYear,
  getYearRange,
} from "@/lib/format";
import type {
  Member,
  MemberBalance,
  ExpenseWithSplits,
  PaymentWithMembers,
  RecurringExpense,
} from "@/types/database";
import { toast } from "sonner";

export default function Home() {
  const [members, setMembers] = useState<Member[]>([]);
  const [balances, setBalances] = useState<MemberBalance[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([]);
  const [payments, setPayments] = useState<PaymentWithMembers[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [newRecurringName, setNewRecurringName] = useState("");
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [year, setYear] = useState(currentYear());
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, b, e, p, r] = await Promise.all([
        getMembers(),
        getMemberBalances(),
        getExpenses(year),
        getPayments(year),
        getRecurringExpenses(),
      ]);
      setMembers(m);
      setBalances(b);
      setExpenses(e);
      setPayments(p);
      setRecurringExpenses(r);
    } catch (err) {
      toast.error("Error al cargar los datos. Verificá la conexión con Supabase.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  async function handleAddRecurring(e: React.FormEvent) {
    e.preventDefault();
    const name = newRecurringName.trim();
    if (!name) return;
    setSavingRecurring(true);
    try {
      await createRecurringExpense(name);
      setNewRecurringName("");
      const updated = await getRecurringExpenses();
      setRecurringExpenses(updated);
      toast.success("Gasto recurrente agregado");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSavingRecurring(false);
    }
  }

  async function handleDeleteRecurring(id: string) {
    if (!confirm("¿Eliminar este gasto recurrente?")) return;
    try {
      await deleteRecurringExpense(id);
      const updated = await getRecurringExpenses();
      setRecurringExpenses(updated);
      toast.success("Eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  async function handleDeleteExpense(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    try {
      await deleteExpense(id);
      toast.success("Gasto eliminado");
      load();
    } catch {
      toast.error("Error al eliminar");
    }
  }

  async function handleDeletePayment(id: string) {
    if (!confirm("¿Eliminar este pago?")) return;
    try {
      await deletePayment(id);
      toast.success("Pago eliminado");
      load();
    } catch {
      toast.error("Error al eliminar");
    }
  }

  function openEditMember(member: Member) {
    setEditingMember(member);
    setMemberDialogOpen(true);
  }

  function openNewMember() {
    setEditingMember(undefined);
    setMemberDialogOpen(true);
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.total_amount, 0);
  const totalExplicitPayments = payments.reduce((s, p) => s + p.amount, 0);

  // Auto-payments: the payer's own share in each expense is implicitly settled
  // when they pay the full bill. We surface it as a synthetic row so that
  // totalPayments approaches totalExpenses as everyone settles their shares.
  type AutoPaymentRow = {
    kind: "auto_payment";
    date: string;
    created_at: string;
    expenseId: string;
    expenseDescription: string;
    member: ExpenseWithSplits["paid_by_member"];
    amount: number;
  };

  const autoPaymentRows: AutoPaymentRow[] = expenses.flatMap((e) => {
    const payerSplit = e.splits.find((s) => s.member_id === e.paid_by);
    if (!payerSplit || payerSplit.amount < 0.01) return [];
    return [
      {
        kind: "auto_payment" as const,
        date: e.date,
        created_at: e.created_at,
        expenseId: e.id,
        expenseDescription: e.description,
        member: e.paid_by_member,
        amount: payerSplit.amount,
      },
    ];
  });

  const totalAutoPayments = autoPaymentRows.reduce((s, r) => s + r.amount, 0);
  const totalPayments = totalExplicitPayments + totalAutoPayments;

  type UnifiedRow =
    | { kind: "expense"; date: string; created_at: string; data: ExpenseWithSplits }
    | { kind: "payment"; date: string; created_at: string; data: PaymentWithMembers }
    | AutoPaymentRow;

  // Build a map from expenseId → autoPaymentRow for quick lookup
  const autoPaymentByExpense = new Map(
    autoPaymentRows.map((ap) => [ap.expenseId, ap])
  );

  // Sortable units: each expense carries its auto-payment with it as a pair,
  // so the auto-payment always renders immediately after its expense.
  type SortUnit =
    | { tag: "pair"; expense: UnifiedRow & { kind: "expense" }; auto?: AutoPaymentRow }
    | { tag: "payment"; row: UnifiedRow & { kind: "payment" } };

  const units: SortUnit[] = [
    ...expenses.map((e) => ({
      tag: "pair" as const,
      expense: { kind: "expense" as const, date: e.date, created_at: e.created_at, data: e },
      auto: autoPaymentByExpense.get(e.id),
    })),
    ...payments.map((p) => ({
      tag: "payment" as const,
      row: { kind: "payment" as const, date: p.date, created_at: p.created_at, data: p },
    })),
  ];

  units.sort((a, b) => {
    const aDate = a.tag === "pair" ? a.expense.date : a.row.date;
    const bDate = b.tag === "pair" ? b.expense.date : b.row.date;
    if (bDate !== aDate) return bDate.localeCompare(aDate);
    const aCat = a.tag === "pair" ? a.expense.created_at : a.row.created_at;
    const bCat = b.tag === "pair" ? b.expense.created_at : b.row.created_at;
    return bCat.localeCompare(aCat);
  });

  const sortedRows: UnifiedRow[] = units.flatMap((u) =>
    u.tag === "pair"
      ? ([...(u.auto ? [u.auto] : []), u.expense] as UnifiedRow[])
      : [u.row]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cuentas Claras Patrón! 🌾</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(year)}
            onValueChange={(v) => { if (v) setYear(Number(v)); }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getYearRange().map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Cambiar tema"
          >
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:block" />
          </Button>
        </div>
      </div>

      {/* Balance cards */}
      {balances.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {balances.map((b) => (
            <Card key={b.member_id}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {b.member_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    b.net_balance >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {formatCurrency(b.net_balance)}
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <div>Pagó: {formatCurrency(b.total_paid)}</div>
                  <div>Le corresponde: {formatCurrency(b.total_owed)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {(totalExpenses > 0 || totalPayments > 0) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            Gastos {year}:{" "}
            <strong className="text-foreground">{formatCurrency(totalExpenses)}</strong>
          </span>
          <span>
            Pagos:{" "}
            <strong className="text-foreground">{formatCurrency(totalPayments)}</strong>
          </span>
          {totalExpenses > 0 && totalPayments > 0 && totalPayments < totalExpenses && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Pendiente: {formatCurrency(totalExpenses - totalPayments)}
            </span>
          )}
        </div>
      )}

      {/* Main tabs */}
      <Tabs defaultValue="movements">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="movements">
              Movimientos{" "}
              <Badge variant="secondary" className="ml-1">
                {sortedRows.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="recurring">
              Gastos Recurrentes{" "}
              <Badge variant="secondary" className="ml-1">
                {recurringExpenses.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="members">
              Miembros{" "}
              <Badge variant="secondary" className="ml-1">
                {members.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPaymentDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Pago
            </Button>
            <Button size="sm" onClick={() => setExpenseDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Gasto
            </Button>
          </div>
        </div>

        {/* Unified movements tab */}
        <TabsContent value="movements">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Cargando...
            </p>
          ) : sortedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay movimientos en {year}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right w-[130px]">Monto</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => {
                  if (row.kind === "expense") {
                    const e = row.data;
                    return (
                      <TableRow
                        key={`e-${e.id}`}
                        className="bg-orange-50/40 hover:bg-orange-50/70 dark:bg-orange-950/10 dark:hover:bg-orange-950/20"
                      >
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {formatDate(e.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex shrink-0 items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                              Gasto
                            </span>
                            <div>
                              <div className="font-medium leading-tight">
                                {e.description}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Pagó: {e.paid_by_member?.name}
                                {e.notes && <> · {e.notes}</>}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(e.total_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            {e.receipt_urls?.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </a>
                            ))}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteExpense(e.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  // Auto-payment: payer's own share (synthetic row, no DB record)
                  if (row.kind === "auto_payment") {
                    const ap = row;
                    return (
                      <TableRow
                        key={`ap-${ap.expenseId}`}
                        className="bg-sky-50/30 hover:bg-sky-50/50 dark:bg-sky-950/8 dark:hover:bg-sky-950/15 opacity-80"
                      >
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {formatDate(ap.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
                              Pago
                            </span>
                            <div>
                              <div className="font-medium leading-tight">
                                {ap.member?.name}
                                <span className="ml-1 font-normal text-muted-foreground text-xs">
                                  · cuota propia
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {ap.expenseDescription}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-sky-700 dark:text-sky-400">
                          {formatCurrency(ap.amount)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  }

                  const p = row.data;
                  return (
                    <TableRow
                      key={`p-${p.id}`}
                      className="bg-sky-50/40 hover:bg-sky-50/70 dark:bg-sky-950/10 dark:hover:bg-sky-950/20"
                    >
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDate(p.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex shrink-0 items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
                            Pago
                          </span>
                          <div>
                            <div className="font-medium leading-tight">
                              {p.from_member?.name}{" "}
                              <span className="text-muted-foreground">→</span>{" "}
                              {p.to_member?.name}
                            </div>
                            {p.notes && (
                              <div className="text-xs text-muted-foreground">
                                {p.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-sky-700 dark:text-sky-400">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {p.receipt_urls?.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          ))}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeletePayment(p.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* Recurring expenses tab */}
        <TabsContent value="recurring">
          <div className="space-y-4">
            <form onSubmit={handleAddRecurring} className="flex items-center gap-2">
              <Input
                placeholder="Ej: Combustible tractor, Junta Vecinal..."
                value={newRecurringName}
                onChange={(e) => setNewRecurringName(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={savingRecurring || !newRecurringName.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </form>

            {recurringExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No hay gastos recurrentes. Agregá los conceptos que se repiten habitualmente.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringExpenses.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteRecurring(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Members tab */}
        <TabsContent value="members">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={openNewMember}>
              <Plus className="h-4 w-4 mr-1" /> Agregar miembro
            </Button>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay miembros. Agregá los participantes de la finca.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-sm">{m.email}</TableCell>
                    <TableCell className="text-sm">{m.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditMember(m)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* Expense dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo gasto</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            members={members}
            recurringExpenses={recurringExpenses}
            onSuccess={() => { setExpenseDialogOpen(false); load(); }}
            onCancel={() => setExpenseDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
          </DialogHeader>
          <PaymentForm
            members={members}
            onSuccess={() => { setPaymentDialogOpen(false); load(); }}
            onCancel={() => setPaymentDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Member dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Editar miembro" : "Nuevo miembro"}
            </DialogTitle>
          </DialogHeader>
          <MemberForm
            existing={editingMember}
            onSuccess={() => { setMemberDialogOpen(false); load(); }}
            onCancel={() => setMemberDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
