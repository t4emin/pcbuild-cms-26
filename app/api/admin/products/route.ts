import { ensureDb, getD1 } from "../../../../db/runtime";
import { getProductRows, normalizeAffiliateUrl, parseProduct, requireAdminRequest, slugify, validateProduct, type ProductInput } from "../../../api-helpers";

export async function GET(request: Request) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await getProductRows() });
}

export async function POST(request: Request) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = await request.json() as ProductInput;
  const errors = validateProduct(input);
  if (errors.length) return Response.json({ errors }, { status: 400 });
  await ensureDb();
  const db = getD1();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = slugify(input.slug || input.title || id);
  try {
    await db.prepare("INSERT INTO products (id, slug, category, brand, model, title, short_description, description, price, affiliate_url, shop_name, images, attributes, performance_score, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, slug, input.category, input.brand?.trim(), input.model?.trim(), input.title?.trim(), input.shortDescription?.trim() ?? "", input.description?.trim() ?? "", Number(input.price), normalizeAffiliateUrl(input.affiliateUrl), input.shopName?.trim() ?? "", JSON.stringify(input.images ?? []), JSON.stringify(input.attributes ?? {}), Number(input.performanceScore ?? 0), input.status === "published" ? "published" : "draft", now, now).run();
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create product" }, { status: 409 });
  }
  const row = await db.prepare("SELECT * FROM products WHERE id = ?").bind(id).first<Record<string, unknown>>();
  return Response.json({ data: row ? parseProduct(row) : null }, { status: 201 });
}
