import { ensureDb, getD1 } from "../../../../../../../db/runtime";
import { auditRequest, requireAdminRequest } from "../../../../../../api-helpers";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string;optionId:string}>}){
  if(!(await requireAdminRequest(request)))return Response.json({error:"Unauthorized"},{status:401});
  const input=await request.json() as {value?:string;label?:string};
  const value=(input.value??"").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"_");
  if(!value||!input.label?.trim())return Response.json({error:"value and label are required"},{status:400});
  const {id,optionId}=await params;
  await ensureDb();
  const result=await getD1().prepare("UPDATE attribute_options SET value = ?, label = ? WHERE id = ? AND attribute_id = ?")
    .bind(value,input.label.trim(),optionId,id).run();
  if(result.meta.changes===0)return Response.json({error:"Option not found"},{status:404});
  await auditRequest(request,"update","attribute_option",optionId,input.label.trim());
  return Response.json({data:{id:optionId,attributeId:id,value,label:input.label.trim()}});
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string;optionId:string}>}){
  if(!(await requireAdminRequest(request)))return Response.json({error:"Unauthorized"},{status:401});
  const {id,optionId}=await params;
  await ensureDb();
  const result=await getD1().prepare("DELETE FROM attribute_options WHERE id = ? AND attribute_id = ?")
    .bind(optionId,id).run();
  if(result.meta.changes>0)await auditRequest(request,"delete","attribute_option",optionId);
  return Response.json({deleted:result.meta.changes>0});
}
