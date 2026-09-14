import { publicJson } from "../../../api-helpers";

export async function GET() {
  return publicJson({ ok: true, service: "buildfit-api", time: new Date().toISOString() });
}

export async function OPTIONS() { return publicJson(null, { status: 204 }); }
