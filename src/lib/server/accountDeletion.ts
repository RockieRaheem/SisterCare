import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function removeStoragePrefix(bucket: string, uid: string): Promise<number> {
  const storage = getSupabaseAdmin().storage.from(bucket);
  const { data, error } = await storage.list(uid, { limit: 1000 });
  if (error) throw new Error(error.message);
  const paths = (data || []).filter((item) => item.name).map((item) => `${uid}/${item.name}`);
  if (!paths.length) return 0;
  const removed = await storage.remove(paths);
  if (removed.error) throw new Error(removed.error.message);
  return paths.length;
}

/**
 * Remove data that can block auth-user deletion. Profile-owned records then
 * cascade from auth.users through profiles under the Supabase schema.
 */
export async function deleteUserData(uid: string): Promise<{
  deletedDocuments: number;
  deletedFiles: number;
}> {
  const db = getSupabaseAdmin();
  let deletedDocuments = 0;
  const articles = await db.from("library_articles").delete({ count: "exact" }).eq("author_id", uid);
  if (articles.error) throw new Error(articles.error.message);
  deletedDocuments += articles.count || 0;

  const events = await db.from("audit_events").delete({ count: "exact" }).or(`actor_id.eq.${uid},subject_id.eq.${uid}`);
  if (events.error) throw new Error(events.error.message);
  deletedDocuments += events.count || 0;

  const fileCounts = await Promise.all([
    removeStoragePrefix("counsellor-profile", uid),
    removeStoragePrefix("counsellor-kyc", uid),
  ]);
  return {
    deletedDocuments,
    deletedFiles: fileCounts.reduce((sum, value) => sum + value, 0),
  };
}
