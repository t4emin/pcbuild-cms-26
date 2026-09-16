import { ensureDb, getD1 } from "../../../../db/runtime";
import { requireAdminRequest } from "../../../api-helpers";

export async function GET(request:Request){
  if(!(await requireAdminRequest(request)))return Response.json({error:"Unauthorized"},{status:401});
  await ensureDb();
  const result=await getD1().prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 80").all();
  return Response.json({data:result.results});
}
