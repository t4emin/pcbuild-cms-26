import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "../auth";
import AdminConsole from "./AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const requestHeaders=await headers();
  const host=requestHeaders.get("host")??"localhost";
  const protocol=requestHeaders.get("x-forwarded-proto")??(host.startsWith("localhost")?"http":"https");
  const user=await getSessionUser(new Request(`${protocol}://${host}/admin`,{headers:requestHeaders}));
  if(!user)redirect("/login");
  return <AdminConsole currentUser={user} />;
}
