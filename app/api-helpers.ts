import { ensureDb, getD1 } from "../db/runtime";

export const categories = ["cpu", "motherboard", "gpu", "memory", "storage", "psu", "case", "cooler"] as const;

export type ProductInput = {
  id?: string; slug?: string; category?: string; brand?: string; model?: string; title?: string;
  shortDescription?: string; description?: string; price?: number; affiliateUrl?: string;
  shopName?: string; images?: string[]; attributes?: Record<string, unknown>;
  performanceScore?: number; status?: string;
};

export function publicJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function parseProduct(row: Record<string, unknown>) {
  return {
    id: row.id, slug: row.slug, category: row.category, brand: row.brand, model: row.model, title: row.title,
    shortDescription: row.short_description, description: row.description, price: row.price,
    affiliateUrl: row.affiliate_url, shopName: row.shop_name,
    images: safeJson(row.images, []), attributes: safeJson(row.attributes, {}),
    performanceScore: row.performance_score, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function safeJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value as T) ?? fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-|-$/g, "");
}

export function validateProduct(input: ProductInput) {
  const errors: string[] = [];
  if (!input.title?.trim()) errors.push("title is required");
  if (!input.brand?.trim()) errors.push("brand is required");
  if (!input.model?.trim()) errors.push("model is required");
  if (!categories.includes(input.category as typeof categories[number])) errors.push("invalid category");
  if (!Number.isFinite(Number(input.price)) || Number(input.price) < 0) errors.push("price must be a positive number");
  if (input.affiliateUrl && !/^https:\/\//.test(input.affiliateUrl)) errors.push("affiliateUrl must use https");
  return errors;
}

export async function requireAdminRequest(request: Request) {
  const url = new URL(request.url);
  if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) return true;
  return Boolean(request.headers.get("oai-authenticated-user-email"));
}

export async function getProductRows(where = "", bindings: unknown[] = []) {
  await ensureDb();
  const db = getD1();
  const query = `SELECT * FROM products ${where} ORDER BY updated_at DESC`;
  const result = await db.prepare(query).bind(...bindings).all<Record<string, unknown>>();
  return result.results.map(parseProduct);
}
