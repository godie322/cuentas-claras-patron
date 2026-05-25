import { createClient } from "@/lib/supabase/client";
import type { RecurringExpense } from "@/types/database";

export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_expenses")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as RecurringExpense[];
}

export async function createRecurringExpense(name: string): Promise<RecurringExpense> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_expenses")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ name } as any)
    .select()
    .single();
  if (error) throw error;
  return data as RecurringExpense;
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
  if (error) throw error;
}
