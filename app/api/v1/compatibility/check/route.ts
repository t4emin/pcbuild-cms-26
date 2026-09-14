import { ensureDb, getD1 } from "../../../../../db/runtime";
import { publicJson } from "../../../../api-helpers";

type Selected = { category: string; attributes: Record<string, unknown> };
const values = (value: unknown) => Array.isArray(value) ? value.map(String) : value == null ? [] : [String(value)];

export async function POST(request: Request) {
  const body = await request.json() as { items?: Selected[] };
  const items = body.items ?? [];
  await ensureDb();
  const rows = await getD1().prepare("SELECT * FROM compatibility_rules WHERE active = 1").all<Record<string, unknown>>();
  const results = rows.results.flatMap((rule) => {
    const left = items.find((item) => item.category === rule.left_category);
    const right = items.find((item) => item.category === rule.right_category);
    if (!left || !right) return [];
    const a = values(left.attributes[String(rule.left_attribute_code)]);
    const b = values(right.attributes[String(rule.right_attribute_code)]);
    const op = String(rule.operator);
    const compatible = op === "equals" ? a.some((v) => b.includes(v))
      : op === "overlaps" || op === "contained_in" ? a.some((v) => b.includes(v))
      : op === "lte" ? Number(a[0]) <= Number(b[0]) : true;
    return [{ ruleId: rule.id, compatible, severity: rule.severity, message: rule.message }];
  });
  const errors = results.filter((result) => !result.compatible && result.severity === "error").length;
  const warnings = results.filter((result) => !result.compatible && result.severity !== "error").length;
  const score = Math.max(0, 100 - errors * 30 - warnings * 10);
  return publicJson({ data: { compatible: errors === 0, score, checks: results } });
}

export async function OPTIONS() { return publicJson(null, { status: 204 }); }
