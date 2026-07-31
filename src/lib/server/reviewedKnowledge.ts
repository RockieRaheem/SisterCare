import { getSupabaseAdmin } from "../supabaseAdmin";

export interface ReviewedKnowledgeCard {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  reviewedAt: string;
  publishedAt: string;
  sourceHref: string;
}

const terms = (value: string) =>
  [...new Set(value.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])].slice(
    0,
    12,
  );

export async function searchReviewedKnowledge(
  query: string,
  category?: string,
): Promise<ReviewedKnowledgeCard[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("library_articles")
    .select(
      "id,title,summary,content,category,tags,reviewed_at,published_at",
    )
    .eq("status", "published")
    .not("reviewed_by", "is", null)
    .not("reviewed_at", "is", null)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  const queryTerms = terms(query);
  const normalizedCategory = category?.trim().toLowerCase();
  return (data || [])
    .map((row) => {
      const searchable = `${row.title} ${row.summary} ${row.category} ${(row.tags || []).join(" ")}`.toLowerCase();
      const title = String(row.title || "").toLowerCase();
      const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
      let score = 0;
      for (const term of queryTerms) {
        if (title.includes(term)) score += 8;
        if (tags.some((tag) => tag.toLowerCase().includes(term))) score += 5;
        if (searchable.includes(term)) score += 2;
      }
      if (normalizedCategory && String(row.category).toLowerCase() === normalizedCategory) {
        score += 4;
      }
      return { row, score };
    })
    .filter(({ score }) => queryTerms.length === 0 || score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ row }) => ({
      id: String(row.id),
      title: String(row.title),
      summary: String(row.summary),
      content: String(row.content).slice(0, 1600),
      category: String(row.category),
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      reviewedAt: String(row.reviewed_at),
      publishedAt: String(row.published_at),
      sourceHref: `/library?article=${encodeURIComponent(String(row.id))}`,
    }));
}
