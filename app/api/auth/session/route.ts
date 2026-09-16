import { getSessionUser } from "../../../auth";

export async function GET(request:Request){
  const user=await getSessionUser(request);
  if(!user)return Response.json({error:"Unauthorized"},{status:401});
  return Response.json({data:{user}});
}
