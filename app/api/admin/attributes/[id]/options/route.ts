import { ensureDb, getD1 } from "../../../../../../db/runtime";
import { requireAdminRequest } from "../../../../../api-helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = await request.json() as { value?: string; label?: string };
  const value = (input.value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  if (!value || !input.label?.trim()) return Response.json({ error: "value and label are required" }, { status: 400 });
  const { id: attributeId } = await params;
  await ensureDb();
  const id = crypto.randomUUID();
  try {
    await getD1().prepare("INSERT INTO attribute_options (id, attribute_id, value, label, sort_order) VALUES (?, ?, ?, ?, 100)").bind(id, attributeId, value, input.label.trim()).run();
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create option" }, { status: 409 });
  }
  return Response.json({ data: { id, attributeId, value, label: input.label.trim() } }, { status: 201 });
}
