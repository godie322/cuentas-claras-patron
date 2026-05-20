import { createClient } from "@/lib/supabase/client";

const BUCKET = "receipts";

export async function uploadReceipt(
  file: File,
  folder: "expenses" | "payments"
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadReceipts(
  files: File[],
  folder: "expenses" | "payments"
): Promise<string[]> {
  return Promise.all(files.map((f) => uploadReceipt(f, folder)));
}

export async function deleteReceipt(url: string): Promise<void> {
  const supabase = createClient();
  const path = url.split(`/${BUCKET}/`)[1];
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
