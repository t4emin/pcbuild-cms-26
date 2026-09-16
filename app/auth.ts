import { env } from "cloudflare:workers";
import { ensureDb,getD1 } from "../db/runtime";
import { hashPassword,hashSessionToken,normalizeUsername,randomToken,verifyPassword } from "./auth-crypto";

export const OWNER_USERNAME="manatdev";
export const SESSION_COOKIE="buildfit_session";
const SESSION_SECONDS=60*60*24*7;
const MAX_FAILURES=5;
const LOCK_MINUTES=15;

export type CmsUser={
  id:string;
  username:string;
  status:"pending"|"active";
  createdAt:string;
  approvedAt:string|null;
  lastLoginAt:string|null;
  isOwner:boolean;
};

type UserRow={
  id:string;username:string;password_hash:string;password_salt:string;
  password_iterations:number;status:string;created_at:string;
  approved_at:string|null;last_login_at:string|null;
};

export async function ensureOwnerAccount(){
  await ensureDb();
  const db=getD1();
  const existing=await db.prepare("SELECT id FROM users WHERE username = ?").bind(OWNER_USERNAME).first();
  if(existing)return;
  const runtime=env as unknown as Record<string,unknown>;
  const password=String(runtime.BOOTSTRAP_ADMIN_PASSWORD||"");
  if(!password)throw new Error("BOOTSTRAP_ADMIN_PASSWORD is not configured");
  const secured=await hashPassword(password);
  const now=new Date().toISOString();
  await db.prepare("INSERT OR IGNORE INTO users (id, username, password_hash, password_salt, password_iterations, status, created_at, approved_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)")
    .bind(crypto.randomUUID(),OWNER_USERNAME,secured.hash,secured.salt,secured.iterations,now,now).run();
}

export async function authenticate(usernameInput:string,password:string,clientIdentifier="local"){
  await ensureOwnerAccount();
  const username=normalizeUsername(usernameInput);
  const attemptKey=`${username}|${clientIdentifier.slice(0,80)}`;
  const db=getD1();
  const attempt=await db.prepare("SELECT failures, window_started_at, locked_until FROM login_attempts WHERE username = ?")
    .bind(attemptKey).first<{failures:number;window_started_at:string;locked_until:string|null}>();
  if(attempt?.locked_until&&Date.parse(attempt.locked_until)>Date.now()){
    return {ok:false as const,status:429,message:"ลองใหม่อีกครั้งในภายหลัง"};
  }
  const row=await db.prepare("SELECT * FROM users WHERE username = ?").bind(username).first<UserRow>();
  const valid=row?await verifyPassword(password,row.password_hash,row.password_salt,row.password_iterations):false;
  if(!row||!valid){
    const windowExpired=attempt&&Date.now()-Date.parse(attempt.window_started_at)>LOCK_MINUTES*60_000;
    await recordFailure(attemptKey,windowExpired?0:attempt?.failures??0);
    return {ok:false as const,status:401,message:"ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"};
  }
  if(row.status!=="active"){
    return {ok:false as const,status:403,message:"บัญชีนี้กำลังรอการอนุมัติ"};
  }
  await db.batch([
    db.prepare("DELETE FROM login_attempts WHERE username = ?").bind(attemptKey),
    db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(new Date().toISOString(),row.id)
  ]);
  const session=await createSession(row.id);
  return {ok:true as const,user:toUser(row),...session};
}

export async function registerUser(usernameInput:string,password:string){
  await ensureOwnerAccount();
  const username=normalizeUsername(usernameInput);
  if(username===OWNER_USERNAME)throw new Error("ชื่อผู้ใช้นี้สงวนไว้");
  const secured=await hashPassword(password);
  const now=new Date().toISOString();
  try{
    await getD1().prepare("INSERT INTO users (id, username, password_hash, password_salt, password_iterations, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)")
      .bind(crypto.randomUUID(),username,secured.hash,secured.salt,secured.iterations,now).run();
  }catch{
    throw new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
  }
}

export async function getSessionUser(request:Request){
  await ensureDb();
  const token=readCookie(request.headers.get("cookie"),SESSION_COOKIE);
  if(!token)return null;
  const id=await hashSessionToken(token);
  const row=await getD1().prepare("SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.id = ? AND sessions.expires_at > ? AND users.status = 'active'")
    .bind(id,new Date().toISOString()).first<UserRow>();
  return row?toUser(row):null;
}

export async function destroySession(request:Request){
  await ensureDb();
  const token=readCookie(request.headers.get("cookie"),SESSION_COOKIE);
  if(token)await getD1().prepare("DELETE FROM sessions WHERE id = ?").bind(await hashSessionToken(token)).run();
}

export async function changePassword(userId:string,currentPassword:string,newPassword:string){
  await ensureDb();
  const db=getD1();
  const row=await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
  if(!row||!(await verifyPassword(currentPassword,row.password_hash,row.password_salt,row.password_iterations))){
    throw new Error("รหัสผ่านปัจจุบันไม่ถูกต้อง");
  }
  const secured=await hashPassword(newPassword);
  await db.batch([
    db.prepare("UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ? WHERE id = ?")
      .bind(secured.hash,secured.salt,secured.iterations,userId),
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId)
  ]);
}

export function sessionCookie(request:Request,token:string,maxAge=SESSION_SECONDS){
  const secure=new URL(request.url).protocol==="https:"?"; Secure":"";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie(request:Request){
  return sessionCookie(request,"",0);
}

export function isSameOrigin(request:Request){
  const origin=request.headers.get("origin");
  return !origin||origin===new URL(request.url).origin;
}

export function isOwner(user:CmsUser|null):user is CmsUser{
  return user?.username===OWNER_USERNAME;
}

async function createSession(userId:string){
  const token=randomToken();
  const id=await hashSessionToken(token);
  const now=new Date();
  const expiresAt=new Date(now.getTime()+SESSION_SECONDS*1000);
  const db=getD1();
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now.toISOString()),
    db.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(id,userId,expiresAt.toISOString(),now.toISOString())
  ]);
  return {token,expiresAt:expiresAt.toISOString()};
}

async function recordFailure(username:string,current:number){
  const failures=current+1;
  const now=new Date();
  const lockedUntil=failures>=MAX_FAILURES
    ? new Date(now.getTime()+LOCK_MINUTES*60_000).toISOString()
    : null;
  await getD1().prepare("INSERT INTO login_attempts (username, failures, window_started_at, locked_until) VALUES (?, ?, ?, ?) ON CONFLICT(username) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until")
    .bind(username,failures,now.toISOString(),lockedUntil).run();
}

function toUser(row:UserRow):CmsUser{
  return {
    id:row.id,username:row.username,status:row.status==="active"?"active":"pending",
    createdAt:row.created_at,approvedAt:row.approved_at,lastLoginAt:row.last_login_at,
    isOwner:row.username===OWNER_USERNAME
  };
}

function readCookie(header:string|null,name:string){
  if(!header)return "";
  for(const part of header.split(";")){
    const [key,...value]=part.trim().split("=");
    if(key===name)return decodeURIComponent(value.join("="));
  }
  return "";
}
