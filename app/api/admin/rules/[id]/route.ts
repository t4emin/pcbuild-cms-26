import { ensureDb, getD1 } from "../../../../../db/runtime";
import { auditRequest, requireAdminRequest } from "../../../../api-helpers";

const required=["leftCategory","leftAttribute","operator","rightCategory","rightAttribute","message"];

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireAdminRequest(request)))return Response.json({error:"Unauthorized"},{status:401});
  const body=await request.json() as Record<string,string|boolean>;
  if(required.some(key=>!body[key]))return Response.json({error:"Missing required fields"},{status:400});
  const {id}=await params;
  await ensureDb();
  const result=await getD1().prepare("UPDATE compatibility_rules SET left_category = ?, left_attribute_code = ?, operator = ?, right_category = ?, right_attribute_code = ?, severity = ?, message = ?, active = ? WHERE id = ?")
    .bind(body.leftCategory,body.leftAttribute,body.operator,body.rightCategory,body.rightAttribute,body.severity||"error",body.message,body.active===false?0:1,id).run();
  if(result.meta.changes===0)return Response.json({error:"Rule not found"},{status:404});
  await auditRequest(request,"update","compatibility_rule",id,String(body.message||""));
  return Response.json({data:{id}});
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireAdminRequest(request)))return Response.json({error:"Unauthorized"},{status:401});
  const {id}=await params;
  await ensureDb();
  const result=await getD1().prepare("DELETE FROM compatibility_rules WHERE id = ?").bind(id).run();
  if(result.meta.changes>0)await auditRequest(request,"delete","compatibility_rule",id);
  return Response.json({deleted:result.meta.changes>0});
}
