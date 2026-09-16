import { getD1 } from "../../../../db/runtime";
import { OWNER_USERNAME } from "../../../auth";
import { requireOwnerRequest } from "../../../api-helpers";

export async function GET(request:Request){
  if(!(await requireOwnerRequest(request)))return Response.json({error:"Forbidden"},{status:403});
  const result=await getD1().prepare("SELECT id, username, status, created_at, approved_at, last_login_at FROM users ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC").all();
  return Response.json({data:result.results.map((row:Record<string,unknown>)=>({
    ...row,isOwner:row.username===OWNER_USERNAME
  }))});
}
