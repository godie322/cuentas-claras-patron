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
import { Plus, Trash2, Eye, Pencil } from "lucide-react";
import { ExpenseForm } from "@/components/expense-form";
import { PaymentForm } from "@/components/payment-form";
import { MemberForm } from "@/components/member-form";
import { getMembers, getMemberBalances } from "@/lib/data/members";
import { getExpenses, deleteExpense } from "@/lib/data/expenses";
import { getPayments, deletePayment } from "@/lib/data/payments";
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
} from "@/types/database";
import { toast } from "sonner";

export default function Home() {
  const [members, setMembers] = useState<Member[]>([]);
  const [balances, setBalances] = useState<MemberBalance[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([]);
  const [payments, setPayments] = useState<PaymentWithMembers[]>([]);
  const [year, setYear] = useState(currentYear());
  const [loading, setLoading] = useState(true);

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, b, e, p] = await Promise.all([
        getMembers(),
        getMemberBalances(),
        getExpenses(year),
        getPayments(year),
      ]);
      setMembers(m);
      setBalances(b);
      setExpenses(e);
      setPayments(p);
    } catch (err) {
      toast.error("Error al cargar los datos. Verificá la conexión con Supabase.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year]);

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
  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cuentas Claras 🌾</h1>
          <p className="text-sm text-muted-foreground">Gastos de la finca</p>
        </div>
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
                    b.net_balance >= 0 ? "text-green-600" : "text-red-600"
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
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            Gastos {year}:{" "}
            <strong className="text-foreground">{formatCurrency(totalExpenses)}</strong>
          </span>
          <span>
            Pagos:{" "}
            <strong className="text-foreground">{formatCurrency(totalPayments)}</strong>
          </span>
        </div>
      )}

      {/* Main tabs */}
      <Tabs defaultValue="expenses">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="expenses">
              Gastos{" "}
              <Badge variant="secondary" className="ml-1">
                {expenses.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="payments">
              Pagos{" "}
              <Badge variant="secondary" className="ml-1">
                {payments.length}
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

        {/* Expenses tab */}
        <TabsContent value="expenses">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay gastos en {year}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Pagado por</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{e.description}</div>
                      {e.notes && (
                        <div className="text-xs text-muted-foreground">{e.notes}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {e.category && <Badge variant="outline">{e.category}</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{e.paid_by_member?.name}</TableCell>
                    <TableCell className="text-right font-medium">
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
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteExpense(e.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* Payments tab */}
        <TabsContent value="payments">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay pagos en {year}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{formatDate(p.date)}</TableCell>
                    <TableCell>{p.from_member?.name}</TableCell>
                    <TableCell>{p.to_member?.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.notes}
                    </TableCell>
                    <TableCell className="text-right font-medium">
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
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeletePayment(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
