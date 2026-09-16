import { getD1 } from "../../../../../db/runtime";
import { getSessionUser,OWNER_USERNAME } from "../../../../auth";
import { requireOwnerRequest } from "../../../../api-helpers";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireOwnerRequest(request)))return Response.json({error:"Forbidden"},{status:403});
  const owner=await getSessionUser(request);
  const {id}=await params;
  const now=new Date().toISOString();
  const result=await getD1().prepare("UPDATE users SET status = 'active', approved_at = ?, approved_by = ? WHERE id = ? AND username <> ?")
    .bind(now,owner?.username??OWNER_USERNAME,id,OWNER_USERNAME).run();
  if(!result.meta.changes)return Response.json({error:"User not found or protected"},{status:404});
  return Response.json({data:{approved:true}});
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireOwnerRequest(request)))return Response.json({error:"Forbidden"},{status:403});
  const {id}=await params;
  const result=await getD1().prepare("DELETE FROM users WHERE id = ? AND username <> ?")
    .bind(id,OWNER_USERNAME).run();
  if(!result.meta.changes)return Response.json({error:"User not found or protected"},{status:404});
  return Response.json({data:{deleted:true}});
}
