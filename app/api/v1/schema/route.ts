import { ensureDb, getD1 } from "../../../../db/runtime";
import { publicJson } from "../../../api-helpers";

export async function GET() {
  await ensureDb();
  const db = getD1();
  const [attributes, options, categoryAttributes, rules] = await Promise.all([
    db.prepare("SELECT * FROM attribute_definitions ORDER BY label").all(),
    db.prepare("SELECT * FROM attribute_options ORDER BY sort_order, label").all(),
    db.prepare("SELECT * FROM category_attributes ORDER BY category, sort_order").all(),
    db.prepare("SELECT * FROM compatibility_rules WHERE active = 1 ORDER BY created_at").all(),
  ]);
  return publicJson({ data: { attributes: attributes.results, options: options.results, categoryAttributes: categoryAttributes.results, rules: rules.results } });
}

export async function OPTIONS() { return publicJson(null, { status: 204 }); }
