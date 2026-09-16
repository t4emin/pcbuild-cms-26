"use client";
import { FormEvent,useState } from "react";

export default function LoginPanel(){
  const [mode,setMode]=useState<"login"|"register">("login");
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  function switchMode(next:"login"|"register"){
    setMode(next);setError("");setSuccess("");setPassword("");setConfirmPassword("");
  }
  async function submit(event:FormEvent){
    event.preventDefault();setError("");setSuccess("");
    if(mode==="register"&&password!==confirmPassword){
      setError("ยืนยันรหัสผ่านไม่ตรงกัน");return;
    }
    setBusy(true);
    try{
      const response=await fetch(`/api/auth/${mode}`,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({username,password})
      });
      const body=await response.json();
      if(!response.ok)throw Error(body.error||"ดำเนินการไม่สำเร็จ");
      if(mode==="login"){window.location.assign("/admin");return}
      setSuccess("ส่งคำขอแล้ว รอ manatdev อนุมัติบัญชี");
      setPassword("");setConfirmPassword("");
    }catch(reason){
      setError(reason instanceof Error?reason.message:"ดำเนินการไม่สำเร็จ");
    }finally{setBusy(false)}
  }
  return <section className="login-panel">
    <div className="login-card">
      <div className="login-card-head"><span>B</span><div><b>BuildFit</b><small>DATA CONSOLE</small></div></div>
      <h2>{mode==="login"?"เข้าสู่ระบบ":"สมัครบัญชี"}</h2>
      <div className="auth-switch">
        <button type="button" className={mode==="login"?"active":""} onClick={()=>switchMode("login")}>เข้าสู่ระบบ</button>
        <button type="button" className={mode==="register"?"active":""} onClick={()=>switchMode("register")}>สมัครบัญชี</button>
      </div>
      <form onSubmit={submit}>
        <label><span>ชื่อผู้ใช้</span><input autoFocus autoComplete="username"
          value={username} onChange={event=>setUsername(event.target.value.toLowerCase())}
          placeholder="your.username" required/></label>
        <label><span>รหัสผ่าน</span><input type="password"
          autoComplete={mode==="login"?"current-password":"new-password"}
          value={password} onChange={event=>setPassword(event.target.value)}
          placeholder="อย่างน้อย 10 ตัวอักษร" required/></label>
        {mode==="register"&&<label><span>ยืนยันรหัสผ่าน</span><input type="password"
          autoComplete="new-password" value={confirmPassword}
          onChange={event=>setConfirmPassword(event.target.value)} required/></label>}
        {error&&<div className="auth-message error">{error}</div>}
        {success&&<div className="auth-message success">{success}</div>}
        <button className="primary auth-submit" disabled={busy}>
          {busy?"กรุณารอสักครู่...":mode==="login"?"เข้าสู่ระบบ":"ส่งคำขอใช้งาน"}
        </button>
      </form>
    </div>
  </section>
}
