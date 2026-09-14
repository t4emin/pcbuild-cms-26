import { env } from "cloudflare:workers";
import { ensureDb, getD1 } from "../../../../db/runtime";
import { requireAdminRequest } from "../../../api-helpers";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "file is required" }, { status: 400 });
  if (!file.type.startsWith("image/")) return Response.json({ error: "Only image files are allowed" }, { status: 415 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Maximum image size is 8 MB" }, { status: 413 });
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const key = `products/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  await env.PRODUCT_IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  await ensureDb();
  await getD1().prepare("INSERT INTO image_objects (key, filename, content_type, size, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(key, file.name, file.type, file.size, new Date().toISOString()).run();
  return Response.json({ data: { key, url: `/api/v1/images/${key}` } }, { status: 201 });
}
