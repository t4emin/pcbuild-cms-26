export const PASSWORD_ITERATIONS=100_000;
export const PASSWORD_MIN_LENGTH=10;

const encoder=new TextEncoder();

export function normalizeUsername(value:string){
  return value.trim().toLowerCase();
}

export function validateUsername(value:string){
  const username=normalizeUsername(value);
  if(username.length<3||username.length>32)return "ชื่อผู้ใช้ต้องมี 3–32 ตัวอักษร";
  if(!/^[a-z0-9._-]+$/.test(username))return "ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง และขีดล่าง";
  return "";
}

export function validatePassword(value:string){
  if(value.length<PASSWORD_MIN_LENGTH)return `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`;
  if(value.length>128)return "รหัสผ่านยาวเกิน 128 ตัวอักษร";
  return "";
}

export function randomToken(bytes=32){
  const data=crypto.getRandomValues(new Uint8Array(bytes));
  return toBase64Url(data);
}

export async function hashPassword(password:string,salt=randomToken(16),iterations=PASSWORD_ITERATIONS){
  const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({
    name:"PBKDF2",hash:"SHA-256",salt:fromBase64Url(salt),iterations
  },key,256);
  return {hash:toBase64Url(new Uint8Array(bits)),salt,iterations};
}

export async function verifyPassword(password:string,hash:string,salt:string,iterations:number){
  const candidate=await hashPassword(password,salt,iterations);
  return timingSafeEqual(candidate.hash,hash);
}

export async function hashSessionToken(token:string){
  const digest=await crypto.subtle.digest("SHA-256",encoder.encode(token));
  return toBase64Url(new Uint8Array(digest));
}

function timingSafeEqual(left:string,right:string){
  const a=encoder.encode(left);
  const b=encoder.encode(right);
  if(a.length!==b.length)return false;
  let difference=0;
  for(let index=0;index<a.length;index++)difference|=a[index]^b[index];
  return difference===0;
}

function toBase64Url(data:Uint8Array){
  let binary="";
  for(const byte of data)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

function fromBase64Url(value:string){
  const base64=value.replace(/-/g,"+").replace(/_/g,"/");
  const padded=base64+"=".repeat((4-base64.length%4)%4);
  const binary=atob(padded);
  return Uint8Array.from(binary,character=>character.charCodeAt(0));
}
