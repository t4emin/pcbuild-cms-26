import { changePassword,clearSessionCookie,getSessionUser,isSameOrigin } from "../../../auth";
import { validatePassword } from "../../../auth-crypto";

export async function POST(request:Request){
  if(!isSameOrigin(request))return Response.json({error:"Invalid origin"},{status:403});
  const user=await getSessionUser(request);
  if(!user)return Response.json({error:"Unauthorized"},{status:401});
  const body=await request.json() as {currentPassword?:string;newPassword?:string};
  const error=validatePassword(body.newPassword??"");
  if(error)return Response.json({error},{status:400});
  try{
    await changePassword(user.id,body.currentPassword??"",body.newPassword??"");
    const response=Response.json({data:{changed:true}});
    response.headers.set("Set-Cookie",clearSessionCookie(request));
    return response;
  }catch(reason){
    return Response.json({error:reason instanceof Error?reason.message:"เปลี่ยนรหัสผ่านไม่สำเร็จ"},{status:400});
  }
}
