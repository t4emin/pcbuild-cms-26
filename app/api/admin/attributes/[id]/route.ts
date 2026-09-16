import { ensureDb, getD1 } from "../../../../../db/runtime";
import { auditRequest, categories, requireAdminRequest } from "../../../../api-helpers";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireAdminRequest(request)))return Response.json({error:"Unauthorized"},{status:401});
  const input=await request.json() as {
    code?:string;label?:string;valueType?:string;allowMultiple?:boolean;
    unit?:string;useForCompatibility?:boolean;categories?:string[];
  };
  const code=(input.code??"").trim().toLowerCase().replace(/[^a-z0-9_]/g,"_");
  const valueTypes=["text","number","select","boolean"];
  if(!code||!input.label?.trim()||!valueTypes.includes(input.valueType??"")){
    return Response.json({error:"code, label and valid valueType are required"},{status:400});
  }
  const selectedCategories=(input.categories??[])
    .filter(item=>categories.includes(item as typeof categories[number]));
  const {id}=await params;
  await ensureDb();
  const db=getD1();
  try{
    await db.batch([
      db.prepare("UPDATE attribute_definitions SET code = ?, label = ?, value_type = ?, allow_multiple = ?, unit = ?, use_for_compatibility = ? WHERE id = ?")
        .bind(code,input.label.trim(),input.valueType,input.allowMultiple?1:0,input.unit?.trim()||null,input.useForCompatibility?1:0,id),
      db.prepare("DELETE FROM category_attributes WHERE attribute_id = ?").bind(id)
    ]);
    for(const [index,category] of selectedCategories.entries()){
      await db.prepare("INSERT INTO category_attributes (category, attribute_id, required, sort_order) VALUES (?, ?, 0, ?)")
        .bind(category,id,100+index).run();
    }
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Unable to update attribute"},{status:409});
  }
  await auditRequest(request,"update","attribute",id,input.label.trim());
  return Response.json({data:{id,code}});
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await requireAdminRequest(request)))return Response.json({error:"Unauthorized"},{status:401});
  const {id}=await params;
  await ensureDb();
  const result=await getD1().prepare("DELETE FROM attribute_definitions WHERE id = ?").bind(id).run();
  if(result.meta.changes>0)await auditRequest(request,"delete","attribute",id);
  return Response.json({deleted:result.meta.changes>0});
}
