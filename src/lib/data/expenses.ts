import { createClient } from "@/lib/supabase/client";
import type { Expense, ExpenseWithSplits } from "@/types/database";

export async function getExpenses(year?: number): Promise<ExpenseWithSplits[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("expenses")
    .select(
      `*, paid_by_member:members!expenses_paid_by_fkey(*), splits:expense_splits(*, member:members(*))`
    )
    .order("date", { ascending: false });

  if (year) {
    query = query
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ExpenseWithSplits[];
}

export async function createExpense(
  expense: {
    description: string;
    total_amount: number;
    date: string;
    paid_by: string;
    notes?: string;
    split_type: "equal" | "custom";
    created_by: string;
    receipt_urls?: string[];
  },
  splits: { member_id: string; amount: number }[]
): Promise<Expense> {
  const supabase = createClient();

  const { data: newExpense, error: expenseError } = await supabase
    .from("expenses")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(expense as any)
    .select()
    .single();
  if (expenseError) throw expenseError;

  const expense_id = (newExpense as Expense).id;
  const splitRows = splits.map((s) => ({
    expense_id,
    member_id: s.member_id,
    amount: s.amount,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: splitError } = await supabase
    .from("expense_splits")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(splitRows as any);
  if (splitError) throw splitError;

  return newExpense as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

export async function getAnnualSummary(year: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("total_amount, category, date, paid_by")
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`);
  if (error) throw error;
  return data;
}

export const EXPENSE_CATEGORIES = [
  "Mantenimiento",
  "Servicios",
  "Impuestos",
  "Alimentación",
  "Combustible",
  "Maquinaria",
  "Construcción",
  "Personal",
  "Veterinario",
  "Semillas / Insumos",
  "Otro",
] as const;
