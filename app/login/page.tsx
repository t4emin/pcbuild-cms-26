import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "../auth";
import LoginPanel from "./LoginPanel";

export const dynamic="force-dynamic";

export default async function LoginPage(){
  const requestHeaders=await headers();
  const host=requestHeaders.get("host")??"localhost";
  const protocol=requestHeaders.get("x-forwarded-proto")??(host.startsWith("localhost")?"http":"https");
  const user=await getSessionUser(new Request(`${protocol}://${host}/login`,{headers:requestHeaders}));
  if(user)redirect("/admin");
  return <main className="login-page simple-login"><LoginPanel/></main>
}
