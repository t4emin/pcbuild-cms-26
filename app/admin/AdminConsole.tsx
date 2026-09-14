/* eslint-disable @next/next/no-img-element -- admin previews include private R2 URLs */
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Product = {
  id:string; slug:string; category:string; brand:string; model:string; title:string;
  shortDescription:string; description:string; price:number; affiliateUrl:string;
  shopName:string; images:string[]; attributes:Record<string,unknown>;
  performanceScore:number; status:string;
};
type Def={id:string;code:string;label:string;value_type:string;allow_multiple:number;unit?:string};
type Opt={id:string;attribute_id:string;value:string;label:string};
type MapRow={category:string;attribute_id:string;sort_order:number};
const categories=["cpu","motherboard","gpu","memory","storage","psu","case","cooler"];
const blank:Product={
  id:"",slug:"",category:"cpu",brand:"",model:"",title:"",shortDescription:"",
  description:"",price:0,affiliateUrl:"",shopName:"",images:[],attributes:{},
  performanceScore:0,status:"draft"
};

export default function AdminConsole(){
  const [tab,setTab]=useState("products");
  const [products,setProducts]=useState<Product[]>([]);
  const [defs,setDefs]=useState<Def[]>([]);
  const [opts,setOpts]=useState<Opt[]>([]);
  const [maps,setMaps]=useState<MapRow[]>([]);
  const [rules,setRules]=useState<Record<string,string>[]>([]);
  const [editing,setEditing]=useState<Product|null>(null);
  const [query,setQuery]=useState("");
  const load=useCallback(async()=>{
    const [p,a,r]=await Promise.all([
      fetch("/api/admin/products").then(x=>x.json()),
      fetch("/api/admin/attributes").then(x=>x.json()),
      fetch("/api/admin/rules").then(x=>x.json())
    ]);
    setProducts(p.data||[]); setDefs(a.data?.definitions||[]);
    setOpts(a.data?.options||[]); setMaps(a.data?.categoryAttributes||[]);
    setRules(r.data||[]);
  },[]);
  useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer)},[load]);
  async function save(p:Product){
    const res=await fetch(p.id?`/api/admin/products/${p.id}`:"/api/admin/products",{
      method:p.id?"PATCH":"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(p)
    });
    const body=await res.json();
    if(!res.ok) throw Error(body.error||body.errors?.join(", ")||"บันทึกไม่สำเร็จ");
    setEditing(null); await load();
  }
  const list=products.filter(p=>(p.title+p.brand+p.model).toLowerCase().includes(query.toLowerCase()));
  const labels:Record<string,string>={
    products:"คลังสินค้า",attributes:"ชนิดข้อมูล",rules:"Compatibility engine",api:"Public API"
  };
  return <div className="admin-shell">
    <aside className="sidebar">
      <div className="brandmark"><b>B</b><div>BuildFit<small>DATA CONSOLE</small></div></div>
      <nav>
        {[["products","◫","สินค้า"],["attributes","⌘","คุณสมบัติ"],["rules","⇄","กฎความเข้ากัน"],["api","{}","API"]].map(x=>
          <button key={x[0]} className={tab===x[0]?"active":""} onClick={()=>setTab(x[0])}>
            <span>{x[1]}</span>{x[2]}
          </button>)}
      </nav>
      <div className="sidebar-foot"><i/>API Online<small>D1 + R2 ready</small></div>
    </aside>
    <main className="workspace">
      <header><div><span className="eyebrow">ADMIN CONSOLE</span><h1>{labels[tab]}</h1></div>
        {tab==="products"&&<button className="primary" onClick={()=>setEditing({...blank})}>+ เพิ่มสินค้า</button>}
      </header>
      {tab==="products"&&<section>
        <div className="toolbar"><input value={query} onChange={e=>setQuery(e.target.value)}
          placeholder="ค้นหาชื่อ รุ่น หรือแบรนด์..."/><span>{list.length} รายการ</span></div>
        <div className="table"><div className="tr table-head">
          <span>สินค้า</span><span>หมวดหมู่</span><span>ราคา</span><span>สถานะ</span><span/>
        </div>{list.map(p=><div className="tr" key={p.id}>
          <span className="product-cell">
            {p.images[0]?<img src={p.images[0]} alt=""/>:<em>{p.category.slice(0,2).toUpperCase()}</em>}
            <span><b>{p.title}</b><small>{p.brand} · {p.model}</small></span>
          </span><span><label className="category">{p.category}</label></span>
          <span>฿{Number(p.price).toLocaleString()}</span>
          <span><label className={`status ${p.status}`}>{p.status==="published"?"เผยแพร่":"ฉบับร่าง"}</label></span>
          <span className="row-actions"><button onClick={()=>setEditing({...p})}>แก้ไข</button>
            <button onClick={async()=>{if(confirm("ลบสินค้านี้?")){
              await fetch(`/api/admin/products/${p.id}`,{method:"DELETE"});await load()
            }}}>ลบ</button></span>
        </div>)}</div>
      </section>}
      {tab==="attributes"&&<Attributes defs={defs} opts={opts} maps={maps} reload={load}/>}
      {tab==="rules"&&<section><div className="section-bar"><p>กฎที่ใช้คำนวณคะแนนความเข้ากันได้</p></div>
        <div className="rules-list">{rules.map(r=><article key={r.id}>
          <span>{r.severity}</span><div><b>{r.left_category}.{r.left_attribute_code} {r.operator} {r.right_category}.{r.right_attribute_code}</b>
          <p>{r.message}</p></div></article>)}</div></section>}
      {tab==="api"&&<section className="api-docs"><p>เปิด CORS พร้อมให้ frontend เรียกใช้</p>
        {["GET /api/v1/products?category=cpu&sort=price_asc","GET /api/v1/products/:slug",
          "GET /api/v1/schema","POST /api/v1/compatibility/check","GET /api/v1/images/:key"].map(x=>
          <div key={x}><code>{x}</code></div>)}
      </section>}
    </main>
    {editing&&<Editor product={editing} defs={defs} opts={opts} maps={maps}
      close={()=>setEditing(null)} save={save}/>}
  </div>
}

function Editor({product:initial,defs,opts,maps,close,save}:{
  product:Product;defs:Def[];opts:Opt[];maps:MapRow[];
  close:()=>void;save:(p:Product)=>Promise<void>
}){
  const [p,setP]=useState(initial),[busy,setBusy]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  const active=useMemo(()=>maps.filter(m=>m.category===p.category)
    .sort((a,b)=>a.sort_order-b.sort_order).map(m=>defs.find(d=>d.id===m.attribute_id))
    .filter(Boolean) as Def[],[p.category,defs,maps]);
  const set=(key:keyof Product,value:unknown)=>setP(old=>({...old,[key]:value}));
  async function upload(files:FileList){
    setBusy(true);
    try{for(const file of Array.from(files)){
      const data=new FormData();data.append("file",file);
      const res=await fetch("/api/admin/uploads",{method:"POST",body:data});
      const json=await res.json();if(!res.ok)throw Error(json.error);
      setP(old=>({...old,images:[...old.images,json.data.url]}));
    }}catch(e){alert(e instanceof Error?e.message:"Upload failed")}finally{setBusy(false)}
  }
  return <div className="scrim"><div className="drawer">
    <div className="drawer-head"><div><span className="eyebrow">{p.id?"EDIT PRODUCT":"NEW PRODUCT"}</span>
      <h2>{p.title||"เพิ่มสินค้าใหม่"}</h2></div><button className="close" onClick={close}>×</button></div>
    <div className="form-body"><h3>ข้อมูลหลัก</h3><div className="grid">
      <Field label="หมวดหมู่"><select value={p.category} onChange={e=>set("category",e.target.value)}>
        {categories.map(c=><option key={c}>{c}</option>)}</select></Field>
      <Field label="สถานะ"><select value={p.status} onChange={e=>set("status",e.target.value)}>
        <option value="draft">ฉบับร่าง</option><option value="published">เผยแพร่</option></select></Field>
      <Field label="แบรนด์"><input value={p.brand} onChange={e=>set("brand",e.target.value)}/></Field>
      <Field label="รุ่น"><input value={p.model} onChange={e=>set("model",e.target.value)}/></Field>
      <Field wide label="ชื่อสินค้า"><input value={p.title} onChange={e=>set("title",e.target.value)}/></Field>
      <Field wide label="คำอธิบายสั้น"><input value={p.shortDescription} onChange={e=>set("shortDescription",e.target.value)}/></Field>
      <Field wide label="รายละเอียด"><textarea rows={5} value={p.description} onChange={e=>set("description",e.target.value)}/></Field>
    </div><h3>ร้านค้า Affiliate</h3><div className="grid">
      <Field label="ชื่อร้าน"><input value={p.shopName} onChange={e=>set("shopName",e.target.value)}/></Field>
      <Field label="ราคา (บาท)"><input type="number" value={p.price} onChange={e=>set("price",+e.target.value)}/></Field>
      <Field wide label="Affiliate URL"><input value={p.affiliateUrl} onChange={e=>set("affiliateUrl",e.target.value)} placeholder="https://..."/></Field>
    </div><h3>รูปสินค้า</h3>
    <div className="dropzone" onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()}
      onDrop={e=>{e.preventDefault();void upload(e.dataTransfer.files)}}>
      <input ref={fileRef} hidden type="file" multiple accept="image/*" onChange={e=>e.target.files&&void upload(e.target.files)}/>
      <b>{busy?"กำลังอัปโหลด...":"วางรูปที่นี่ หรือคลิกเพื่อเลือก"}</b><small>JPG, PNG, WebP · สูงสุด 8 MB</small>
    </div><div className="image-list">{p.images.map((src,i)=><div key={src}>
      <img src={src} alt=""/><button onClick={()=>set("images",p.images.filter((_,n)=>n!==i))}>×</button>
    </div>)}</div><h3>คุณสมบัติสำหรับ {p.category}</h3><div className="grid">
      {active.map(d=><Field key={d.id} label={d.label+(d.unit?` (${d.unit})`:"")}>
        <Attribute def={d} options={opts.filter(o=>o.attribute_id===d.id)}
          value={p.attributes[d.code]} change={v=>set("attributes",{...p.attributes,[d.code]:v})}/>
      </Field>)}
    </div></div><div className="drawer-foot"><button className="secondary" onClick={close}>ยกเลิก</button>
      <button className="primary" disabled={busy} onClick={async()=>{setBusy(true);try{await save(p)}
        catch(e){alert(e instanceof Error?e.message:"ผิดพลาด");setBusy(false)}}}>บันทึกสินค้า</button>
    </div>
  </div></div>
}

function Attribute({def,options,value,change}:{def:Def;options:Opt[];value:unknown;change:(v:unknown)=>void}){
  if(def.value_type==="select")return <select multiple={!!def.allow_multiple}
    value={(def.allow_multiple?(Array.isArray(value)?value:[]):String(value??"")) as string|string[]}
    onChange={e=>change(def.allow_multiple?Array.from(e.currentTarget.selectedOptions,o=>o.value):e.target.value)}>
    <option value="">— เลือก —</option>{options.map(o=><option key={o.id} value={o.value}>{o.label}</option>)}
  </select>;
  return <input type={def.value_type==="number"?"number":"text"} value={String(value??"")}
    onChange={e=>change(def.value_type==="number"?+e.target.value:e.target.value)}/>
}
function Field({label,wide,children}:{label:string;wide?:boolean;children:React.ReactNode}){
  return <label className={wide?"field wide":"field"}><span>{label}</span>{children}</label>
}
function Attributes({defs,opts,maps,reload}:{defs:Def[];opts:Opt[];maps:MapRow[];reload:()=>Promise<void>}){
  async function addDef(){const label=prompt("ชื่อคุณสมบัติ เช่น Socket");if(!label)return;
    const code=prompt("รหัส เช่น socket");if(!code)return;
    const categories=prompt("หมวดหมู่ คั่นด้วย comma","cpu,motherboard")?.split(",")||[];
    await fetch("/api/admin/attributes",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({label,code,categories,valueType:"select",useForCompatibility:true})});await reload()}
  async function addOption(d:Def){const value=prompt(`เพิ่มตัวเลือกให้ ${d.label}`);if(!value)return;
    await fetch(`/api/admin/attributes/${d.id}/options`,{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({value,label:value})});await reload()}
  return <section><div className="section-bar"><p>ใช้ข้อมูลชุดเดียวทั้งการแสดงผลและแมปการรองรับ</p>
    <button className="primary" onClick={addDef}>+ เพิ่มคุณสมบัติ</button></div>
    <div className="card-grid">{defs.map(d=><article className="attribute-card" key={d.id}>
      <span className="type">{d.value_type}</span><h3>{d.label}</h3><code>{d.code}</code>
      <p>{maps.filter(m=>m.attribute_id===d.id).map(m=>m.category).join(" · ")}</p>
      {d.value_type==="select"&&<div className="chips">{opts.filter(o=>o.attribute_id===d.id)
        .map(o=><span key={o.id}>{o.label}</span>)}<button onClick={()=>addOption(d)}>+ เพิ่มตัวเลือก</button></div>}
    </article>)}</div>
  </section>
}
