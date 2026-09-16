import { ensureDb, getD1 } from "../../../../db/runtime";
import { parseProduct, publicJson } from "../../../api-helpers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status") ?? "published";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const brand = (url.searchParams.get("brand") ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(60, Math.max(1, Number(url.searchParams.get("limit") || 24)));
  const sort = url.searchParams.get("sort") ?? "updated";
  const filters = ["status = ?"];
  const bindings: unknown[] = [status];
  if (category) { filters.push("category = ?"); bindings.push(category); }
  await ensureDb();
  const db = getD1();
  const order = sort === "price_asc" ? "price ASC" : sort === "price_desc" ? "price DESC" : "updated_at DESC";
  const result = await db.prepare(`SELECT * FROM products WHERE ${filters.join(" AND ")} ORDER BY ${order}`).bind(...bindings).all<Record<string, unknown>>();
  const attributeFilters = Array.from(url.searchParams.entries())
    .filter(([key,value]) => key.startsWith("attr_") && value.trim())
    .map(([key,value]) => [key.slice(5), value.split(",").map(item => item.trim()).filter(Boolean)] as const);
  const allProducts = result.results.map((row) => {
    const product = parseProduct(row);
    return { ...product, images: product.images.map((src: string) => new URL(src, request.url).href) };
  }).filter((product) => {
    if (q && !`${product.title} ${product.brand} ${product.model}`.toLowerCase().includes(q)) return false;
    if (brand && String(product.brand).toLowerCase() !== brand) return false;
    return attributeFilters.every(([code, wanted]) => {
      const raw = (product.attributes as Record<string, unknown>)[code];
      const values = Array.isArray(raw) ? raw.map(String) : raw == null ? [] : [String(raw)];
      return wanted.some((value) => values.includes(value));
    });
  });
  const start = (page - 1) * limit;
  const products = allProducts.slice(start, start + limit);
  return publicJson({ data: products, meta: {
    count: products.length, total: allProducts.length, page, limit,
    pages: Math.max(1, Math.ceil(allProducts.length / limit))
  } });
}

export async function OPTIONS() { return publicJson(null, { status: 204 }); }

export async function POST() { return publicJson({ error: "Use /api/admin/products" }, { status: 405 }); }
