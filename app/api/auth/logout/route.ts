import { clearSessionCookie,destroySession,isSameOrigin } from "../../../auth";

export async function POST(request:Request){
  if(!isSameOrigin(request))return Response.json({error:"Invalid origin"},{status:403});
  await destroySession(request);
  const response=Response.json({data:{signedOut:true}});
  response.headers.set("Set-Cookie",clearSessionCookie(request));
  return response;
}
