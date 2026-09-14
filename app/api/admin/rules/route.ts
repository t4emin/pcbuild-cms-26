import { ensureDb, getD1 } from "../../../../db/runtime";
import { requireAdminRequest } from "../../../api-helpers";

export async function GET(request: Request) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureDb();
  const result = await getD1().prepare("SELECT * FROM compatibility_rules ORDER BY created_at DESC").all();
  return Response.json({ data: result.results });
}

export async function POST(request: Request) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Record<string, string | boolean>;
  const required = ["leftCategory", "leftAttribute", "operator", "rightCategory", "rightAttribute", "message"];
  if (required.some((key) => !body[key])) return Response.json({ error: "Missing required fields" }, { status: 400 });
  await ensureDb();
  const id = crypto.randomUUID();
  await getD1().prepare("INSERT INTO compatibility_rules (id, left_category, left_attribute_code, operator, right_category, right_attribute_code, severity, message, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, body.leftCategory, body.leftAttribute, body.operator, body.rightCategory, body.rightAttribute, body.severity || "error", body.message, body.active === false ? 0 : 1, new Date().toISOString()).run();
  return Response.json({ data: { id } }, { status: 201 });
}
