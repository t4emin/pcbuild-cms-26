import assert from "node:assert/strict";
import { access,readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeAffiliateUrl } from "../app/url-utils.ts";

test("ships the BuildFit landing page and admin console",async()=>{
  const [page,admin,layout]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/admin/AdminConsole.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/layout.tsx",import.meta.url),"utf8")
  ]);
  assert.match(layout,/BuildFit Backend/);
  assert.match(page,/Product data that understands PC parts/);
  assert.match(admin,/เพิ่มสินค้า/);
  assert.match(admin,/dropzone/);
  assert.match(admin,/เพิ่มตัวเลือก/);
});

test("ships public and protected API routes",async()=>{
  const routes=[
    "../app/api/v1/products/route.ts",
    "../app/api/v1/schema/route.ts",
    "../app/api/v1/compatibility/check/route.ts",
    "../app/api/admin/products/route.ts",
    "../app/api/admin/uploads/route.ts",
    "../app/api/admin/attributes/route.ts"
  ];
  await Promise.all(routes.map(path=>access(new URL(path,import.meta.url))));
  const compatibility=await readFile(new URL(routes[2],import.meta.url),"utf8");
  assert.match(compatibility,/score/);
  assert.match(compatibility,/contained_in/);
});

test("normalizes pasted affiliate URLs",()=>{
  assert.equal(normalizeAffiliateUrl("  https://s.shopee.co.th/9AOcemGiaB  "),"https://s.shopee.co.th/9AOcemGiaB");
  assert.equal(normalizeAffiliateUrl("[Shopee](https://s.shopee.co.th/9AOcemGiaB)"),"https://s.shopee.co.th/9AOcemGiaB");
  assert.equal(normalizeAffiliateUrl("s.shopee.co.th/9AOcemGiaB"),"https://s.shopee.co.th/9AOcemGiaB");
});
