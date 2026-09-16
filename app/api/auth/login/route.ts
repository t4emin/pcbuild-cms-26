import { authenticate,isSameOrigin,sessionCookie } from "../../../auth";
import { validatePassword,validateUsername } from "../../../auth-crypto";

export async function POST(request:Request){
  if(!isSameOrigin(request))return Response.json({error:"Invalid origin"},{status:403});
  const body=await request.json() as {username?:string;password?:string};
  const username=body.username??"";
  const password=body.password??"";
  if(validateUsername(username)||validatePassword(password)){
    return Response.json({error:"ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"},{status:400});
  }
  const clientIdentifier=request.headers.get("cf-connecting-ip")
    ??request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ??"local";
  const result=await authenticate(username,password,clientIdentifier);
  if(!result.ok)return Response.json({error:result.message},{status:result.status});
  const response=Response.json({data:{user:result.user}});
  response.headers.set("Set-Cookie",sessionCookie(request,result.token));
  return response;
}
