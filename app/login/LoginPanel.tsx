"use client";
import { FormEvent,useState } from "react";

export default function LoginPanel(){
  const [mode,setMode]=useState<"login"|"register">("login");
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [registrationComplete,setRegistrationComplete]=useState(false);

  function switchMode(next:"login"|"register"){
    setMode(next);setError("");setPassword("");setConfirmPassword("");
  }
  async function submit(event:FormEvent){
    event.preventDefault();setError("");
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
      setRegistrationComplete(true);setMode("login");
      setUsername("");setPassword("");setConfirmPassword("");
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
        <label><input aria-label="Username" autoFocus autoComplete="username"
          value={username} onChange={event=>setUsername(event.target.value.toLowerCase())}
          placeholder="Username" required/></label>
        <label><input aria-label="Password" type="password"
          autoComplete={mode==="login"?"current-password":"new-password"}
          value={password} onChange={event=>setPassword(event.target.value)}
          placeholder="Password" required/></label>
        {mode==="register"&&<label><input aria-label="Confirm password" type="password"
          autoComplete="new-password" value={confirmPassword}
          onChange={event=>setConfirmPassword(event.target.value)}
          placeholder="Confirm password" required/></label>}
        {error&&<div className="auth-message error">{error}</div>}
        <button className="primary auth-submit" disabled={busy}>
          {busy?"กรุณารอสักครู่...":mode==="login"?"เข้าสู่ระบบ":"ส่งคำขอใช้งาน"}
        </button>
      </form>
    </div>
    {registrationComplete&&<div className="admin-modal-backdrop signup-success-backdrop">
      <div className="admin-modal signup-success-modal" role="dialog" aria-modal="true"
        aria-labelledby="signup-success-title">
        <div className="signup-success-icon" aria-hidden="true">✓</div>
        <h2 id="signup-success-title">สมัครสำเร็จ</h2>
        <button className="primary" onClick={()=>setRegistrationComplete(false)}>เข้าสู่ระบบ</button>
      </div>
    </div>}
  </section>
}
