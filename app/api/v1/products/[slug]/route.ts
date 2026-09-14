import { ensureDb, getD1 } from "../../../../../db/runtime";
import { parseProduct, publicJson } from "../../../../api-helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  await ensureDb();
  const { slug } = await params;
  const row = await getD1().prepare("SELECT * FROM products WHERE slug = ? AND status = 'published' LIMIT 1").bind(slug).first<Record<string, unknown>>();
  if (!row) return publicJson({ error: "Product not found" }, { status: 404 });
  return publicJson({ data: parseProduct(row) });
}

export async function OPTIONS() { return publicJson(null, { status: 204 }); }
