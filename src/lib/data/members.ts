import { createClient } from "@/lib/supabase/client";
import type { Member, MemberBalance } from "@/types/database";

export async function getMembers(): Promise<Member[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Member[];
}

export async function createMember(member: {
  name: string;
  email: string;
  phone?: string;
}): Promise<Member> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(member as any)
    .select()
    .single();
  if (error) throw error;
  return data as Member;
}

export async function updateMember(
  id: string,
  updates: Partial<Pick<Member, "name" | "email" | "phone">>
): Promise<Member> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Member;
}

export async function getMemberBalances(): Promise<MemberBalance[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("member_balances")
    .select("*")
    .order("member_name");
  if (error) throw error;
  return (data ?? []) as MemberBalance[];
}
