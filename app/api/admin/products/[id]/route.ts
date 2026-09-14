import { ensureDb, getD1 } from "../../../../../db/runtime";
import { parseProduct, requireAdminRequest, slugify, validateProduct, type ProductInput } from "../../../../api-helpers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = await request.json() as ProductInput;
  const errors = validateProduct(input);
  if (errors.length) return Response.json({ errors }, { status: 400 });
  const { id } = await params;
  await ensureDb();
  const db = getD1();
  const now = new Date().toISOString();
  await db.prepare("UPDATE products SET slug = ?, category = ?, brand = ?, model = ?, title = ?, short_description = ?, description = ?, price = ?, affiliate_url = ?, shop_name = ?, images = ?, attributes = ?, performance_score = ?, status = ?, updated_at = ? WHERE id = ?")
    .bind(slugify(input.slug || input.title || id), input.category, input.brand?.trim(), input.model?.trim(), input.title?.trim(), input.shortDescription?.trim() ?? "", input.description?.trim() ?? "", Number(input.price), input.affiliateUrl?.trim() ?? "", input.shopName?.trim() ?? "", JSON.stringify(input.images ?? []), JSON.stringify(input.attributes ?? {}), Number(input.performanceScore ?? 0), input.status === "published" ? "published" : "draft", now, id).run();
  const row = await db.prepare("SELECT * FROM products WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) return Response.json({ error: "Product not found" }, { status: 404 });
  return Response.json({ data: parseProduct(row) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await ensureDb();
  const result = await getD1().prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  return Response.json({ deleted: result.meta.changes > 0 });
}
