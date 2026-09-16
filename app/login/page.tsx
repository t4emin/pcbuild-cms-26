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
  return <main className="login-page">
    <section className="login-brand">
      <div className="login-mark">B</div>
      <div><span>BUILDFIT DATA CONSOLE</span>
        <h1>พื้นที่จัดการข้อมูล<br/>สำหรับทีมของคุณ</h1>
        <p>สินค้า รูปภาพ และกฎความเข้ากันได้ อยู่ในระบบเดียวที่เข้าถึงได้เฉพาะบัญชีที่ได้รับอนุมัติ</p>
      </div>
      <div className="login-security"><i/>Secure session · Approval required</div>
    </section>
    <LoginPanel/>
  </main>
}
