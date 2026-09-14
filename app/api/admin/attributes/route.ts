import { ensureDb, getD1 } from "../../../../db/runtime";
import { categories, requireAdminRequest } from "../../../api-helpers";

export async function GET(request: Request) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureDb();
  const db = getD1();
  const [definitions, options, categoryAttributes] = await Promise.all([
    db.prepare("SELECT * FROM attribute_definitions ORDER BY label").all(),
    db.prepare("SELECT * FROM attribute_options ORDER BY sort_order, label").all(),
    db.prepare("SELECT * FROM category_attributes ORDER BY category, sort_order").all(),
  ]);
  return Response.json({ data: { definitions: definitions.results, options: options.results, categoryAttributes: categoryAttributes.results } });
}

export async function POST(request: Request) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = await request.json() as { code?: string; label?: string; valueType?: string; allowMultiple?: boolean; unit?: string; useForCompatibility?: boolean; categories?: string[] };
  const code = (input.code ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const valueTypes = ["text", "number", "select", "boolean"];
  if (!code || !input.label?.trim() || !valueTypes.includes(input.valueType ?? "")) return Response.json({ error: "code, label and valid valueType are required" }, { status: 400 });
  const selectedCategories = (input.categories ?? []).filter((item) => categories.includes(item as typeof categories[number]));
  await ensureDb();
  const db = getD1();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await db.prepare("INSERT INTO attribute_definitions (id, code, label, value_type, allow_multiple, unit, use_for_display, use_for_compatibility, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)").bind(id, code, input.label.trim(), input.valueType, input.allowMultiple ? 1 : 0, input.unit?.trim() || null, input.useForCompatibility ? 1 : 0, now).run();
    for (const [index, category] of selectedCategories.entries()) await db.prepare("INSERT INTO category_attributes (category, attribute_id, required, sort_order) VALUES (?, ?, 0, ?)").bind(category, id, 100 + index).run();
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create attribute" }, { status: 409 });
  }
  return Response.json({ data: { id, code } }, { status: 201 });
}
