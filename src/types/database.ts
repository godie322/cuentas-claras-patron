export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["members"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
      };
      expenses: {
        Row: {
          id: string;
          description: string;
          total_amount: number;
          date: string;
          paid_by: string;
          category: string | null;
          receipt_url: string | null;
          notes: string | null;
          split_type: "equal" | "custom";
          created_at: string;
          created_by: string;
        };
        Insert: Omit<Database["public"]["Tables"]["expenses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          member_id: string;
          amount: number;
        };
        Insert: Omit<Database["public"]["Tables"]["expense_splits"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["expense_splits"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          from_member_id: string;
          to_member_id: string;
          amount: number;
          date: string;
          receipt_url: string | null;
          notes: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
    };
    Views: {
      member_balances: {
        Row: {
          member_id: string;
          member_name: string;
          total_paid: number;
          total_owed: number;
          net_balance: number;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Member = Database["public"]["Tables"]["members"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type ExpenseSplit = Database["public"]["Tables"]["expense_splits"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type MemberBalance = Database["public"]["Views"]["member_balances"]["Row"];

export type ExpenseWithSplits = Expense & {
  splits: (ExpenseSplit & { member: Member })[];
  paid_by_member: Member;
};

export type PaymentWithMembers = Payment & {
  from_member: Member;
  to_member: Member;
};
