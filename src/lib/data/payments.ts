import { createClient } from "@/lib/supabase/client";
import type { PaymentWithMembers } from "@/types/database";

export async function getPayments(year?: number): Promise<PaymentWithMembers[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("payments")
    .select(
      `*, from_member:members!payments_from_member_id_fkey(*), to_member:members!payments_to_member_id_fkey(*)`
    )
    .order("date", { ascending: false });

  if (year) {
    query = query
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PaymentWithMembers[];
}

export async function createPayment(payment: {
  from_member_id: string;
  to_member_id: string;
  amount: number;
  date: string;
  notes?: string;
  created_by: string;
  receipt_url?: string;
}): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("payments").insert(payment as any);
  if (error) throw error;
}

export async function deletePayment(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw error;
}
