import { isSameOrigin,registerUser } from "../../../auth";
import { validatePassword,validateUsername } from "../../../auth-crypto";

export async function POST(request:Request){
  if(!isSameOrigin(request))return Response.json({error:"Invalid origin"},{status:403});
  const body=await request.json() as {username?:string;password?:string};
  const username=body.username??"";
  const password=body.password??"";
  const error=validateUsername(username)||validatePassword(password);
  if(error)return Response.json({error},{status:400});
  try{
    await registerUser(username,password);
    return Response.json({data:{status:"pending"}},{status:201});
  }catch(reason){
    return Response.json({error:reason instanceof Error?reason.message:"สมัครบัญชีไม่สำเร็จ"},{status:409});
  }
}
