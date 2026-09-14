import { ensureDb, getD1 } from "../../../../db/runtime";
import { parseProduct, publicJson } from "../../../api-helpers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status") ?? "published";
  const sort = url.searchParams.get("sort") ?? "updated";
  const filters = ["status = ?"];
  const bindings: unknown[] = [status];
  if (category) { filters.push("category = ?"); bindings.push(category); }
  await ensureDb();
  const db = getD1();
  const order = sort === "price_asc" ? "price ASC" : sort === "price_desc" ? "price DESC" : "updated_at DESC";
  const result = await db.prepare(`SELECT * FROM products WHERE ${filters.join(" AND ")} ORDER BY ${order}`).bind(...bindings).all<Record<string, unknown>>();
  const products = result.results.map((row) => {
    const product = parseProduct(row);
    return { ...product, images: product.images.map((src: string) => new URL(src, request.url).href) };
  });
  return publicJson({ data: products, meta: { count: products.length } });
}

export async function OPTIONS() { return publicJson(null, { status: 204 }); }

export async function POST() { return publicJson({ error: "Use /api/admin/products" }, { status: 405 }); }
