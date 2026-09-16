import assert from "node:assert/strict";
import { access,readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeAffiliateUrl } from "../app/url-utils.ts";
import { hashPassword,normalizeUsername,validatePassword,validateUsername,verifyPassword } from "../app/auth-crypto.ts";

test("ships the BuildFit landing page and admin console",async()=>{
  const [page,admin,layout,login]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/admin/AdminConsole.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/layout.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/login/LoginPanel.tsx",import.meta.url),"utf8")
  ]);
  assert.match(layout,/BuildFit Backend/);
  assert.match(page,/Product data that understands PC parts/);
  assert.match(admin,/เพิ่มสินค้า/);
  assert.match(admin,/dropzone/);
  assert.match(admin,/เพิ่มตัวเลือก/);
  assert.match(admin,/เพิ่มชนิดข้อมูล/);
  assert.match(admin,/Code สำหรับ API/);
  assert.match(admin,/ใช้กับหมวดสินค้า/);
  assert.doesNotMatch(admin,/\bprompt\s*\(/);
  assert.match(admin,/body\.style\.overflow="hidden"/);
  assert.match(admin,/body\.style\.position="fixed"/);
  assert.match(admin,/ผู้ใช้งาน/);
  assert.match(admin,/ออกจากระบบ/);
  assert.doesNotMatch(admin,/ลบไม่ได้/);
  assert.match(login,/สมัครบัญชี/);
  assert.match(login,/BuildFit/);
  assert.doesNotMatch(login,/พื้นที่จัดการข้อมูล/);
});

test("ships public and protected API routes",async()=>{
  const routes=[
    "../app/api/v1/products/route.ts",
    "../app/api/v1/schema/route.ts",
    "../app/api/v1/compatibility/check/route.ts",
    "../app/api/admin/products/route.ts",
    "../app/api/admin/uploads/route.ts",
    "../app/api/admin/attributes/route.ts"
    ,"../app/api/auth/login/route.ts"
    ,"../app/api/auth/register/route.ts"
    ,"../app/api/auth/logout/route.ts"
    ,"../app/api/admin/users/route.ts"
  ];
  await Promise.all(routes.map(path=>access(new URL(path,import.meta.url))));
  const compatibility=await readFile(new URL(routes[2],import.meta.url),"utf8");
  assert.match(compatibility,/score/);
  assert.match(compatibility,/contained_in/);
});

test("hashes passwords and validates account credentials",async()=>{
  assert.equal(normalizeUsername("  Manat.Dev  "),"manat.dev");
  assert.equal(validateUsername("valid_user"),"");
  assert.notEqual(validateUsername("invalid user"),"");
  assert.equal(validatePassword("0123456789"),"");
  assert.notEqual(validatePassword("short"),"");
  const secured=await hashPassword("correct horse battery staple",undefined,1_000);
  assert.equal(await verifyPassword("correct horse battery staple",secured.hash,secured.salt,secured.iterations),true);
  assert.equal(await verifyPassword("wrong password",secured.hash,secured.salt,secured.iterations),false);
});

test("normalizes pasted affiliate URLs",()=>{
  assert.equal(normalizeAffiliateUrl("  https://s.shopee.co.th/9AOcemGiaB  "),"https://s.shopee.co.th/9AOcemGiaB");
  assert.equal(normalizeAffiliateUrl("[Shopee](https://s.shopee.co.th/9AOcemGiaB)"),"https://s.shopee.co.th/9AOcemGiaB");
  assert.equal(normalizeAffiliateUrl("s.shopee.co.th/9AOcemGiaB"),"https://s.shopee.co.th/9AOcemGiaB");
});
