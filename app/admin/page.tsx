import { headers } from "next/headers";
import { requireChatGPTUser } from "../chatgpt-auth";
import AdminConsole from "./AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const host = (await headers()).get("host") ?? "";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  if (!local) await requireChatGPTUser("/admin");
  return <AdminConsole />;
}
