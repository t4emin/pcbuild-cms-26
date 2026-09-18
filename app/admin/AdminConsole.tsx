/* eslint-disable @next/next/no-img-element -- admin previews include private R2 URLs */
"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CmsUser } from "../auth";

type Product = {
  id:string; slug:string; category:string; brand:string; model:string; title:string;
  shortDescription:string; description:string; price:number; affiliateUrl:string;
  shopName:string; images:string[]; attributes:Record<string,unknown>;
  performanceScore:number; status:string;
};
type Def={
  id:string;code:string;label:string;value_type:string;allow_multiple:number;
  unit?:string;use_for_compatibility?:number;
};
type Opt={id:string;attribute_id:string;value:string;label:string};
type MapRow={category:string;attribute_id:string;required:number;sort_order:number};
type Rule={
  id:string;left_category:string;left_attribute_code:string;operator:string;
  right_category:string;right_attribute_code:string;severity:string;message:string;active:number;
};
type AuditRow={
  id:string;actor:string;action:string;target_type:string;target_id:string;summary:string;created_at:string;
};
const categories=["cpu","motherboard","gpu","memory","storage","psu","case","cooler"];
const categoryOptions=categories.map(value=>({value,label:value.toUpperCase()}));
const statusOptions=[
  {value:"draft",label:"ฉบับร่าง"},
  {value:"published",label:"เผยแพร่"}
];
const blank:Product={
  id:"",slug:"",category:"cpu",brand:"",model:"",title:"",shortDescription:"",
  description:"",price:0,affiliateUrl:"",shopName:"",images:[],attributes:{},
  performanceScore:0,status:"draft"
};
const requiredMessage="กรุณากรอกข้อมูล";

async function cmsFetch(input:RequestInfo|URL,init?:RequestInit){
  const response=await fetch(input,init);
  if(response.status===401){
    window.location.assign("/login");
    throw new Error("Session expired");
  }
  return response;
}

function useBodyScrollLock(){
  useEffect(()=>{
    const body=document.body;
    const scrollY=window.scrollY;
    const scrollbarWidth=window.innerWidth-document.documentElement.clientWidth;
    const previous={
      overflow:body.style.overflow,position:body.style.position,top:body.style.top,
      width:body.style.width,paddingRight:body.style.paddingRight
    };
    body.style.overflow="hidden";body.style.position="fixed";
    body.style.top=`-${scrollY}px`;body.style.width="100%";
    if(scrollbarWidth>0){
      const paddingRight=Number.parseFloat(getComputedStyle(body).paddingRight)||0;
      body.style.paddingRight=`${paddingRight+scrollbarWidth}px`;
    }
    return()=>{
      body.style.overflow=previous.overflow;body.style.position=previous.position;
      body.style.top=previous.top;body.style.width=previous.width;
      body.style.paddingRight=previous.paddingRight;window.scrollTo(0,scrollY);
    };
  },[]);
}

export default function AdminConsole({currentUser}:{currentUser:CmsUser}){
  const [tab,setTab]=useState("products");
  const [products,setProducts]=useState<Product[]>([]);
  const [defs,setDefs]=useState<Def[]>([]);
  const [opts,setOpts]=useState<Opt[]>([]);
  const [maps,setMaps]=useState<MapRow[]>([]);
  const [rules,setRules]=useState<Rule[]>([]);
  const [audits,setAudits]=useState<AuditRow[]>([]);
  const [editing,setEditing]=useState<Product|null>(null);
  const [accountOpen,setAccountOpen]=useState(false);
  const [query,setQuery]=useState("");
  const load=useCallback(async()=>{
    const [p,a,r,log]=await Promise.all([
      cmsFetch("/api/admin/products").then(x=>x.json()),
      cmsFetch("/api/admin/attributes").then(x=>x.json()),
      cmsFetch("/api/admin/rules").then(x=>x.json()),
      cmsFetch("/api/admin/audit").then(x=>x.json())
    ]);
    setProducts(p.data||[]); setDefs(a.data?.definitions||[]);
    setOpts(a.data?.options||[]); setMaps(a.data?.categoryAttributes||[]);
    setRules(r.data||[]);
    setAudits(log.data||[]);
  },[]);
  useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer)},[load]);
  async function save(p:Product){
    const res=await cmsFetch(p.id?`/api/admin/products/${p.id}`:"/api/admin/products",{
      method:p.id?"PATCH":"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(p)
    });
    const body=await res.json();
    if(!res.ok) throw Error(body.error||body.errors?.join(", ")||"บันทึกไม่สำเร็จ");
    setEditing(null); await load();
  }
  const list=products.filter(p=>(p.title+p.brand+p.model).toLowerCase().includes(query.toLowerCase()));
  const labels:Record<string,string>={
    products:"คลังสินค้า",attributes:"ชนิดข้อมูล",rules:"Compatibility engine",
    users:"ผู้ใช้งาน",audit:"Activity log",api:"Public API"
  };
  const navigation=[
    ["products","◫","สินค้า"],["attributes","⌘","คุณสมบัติ"],
    ["rules","⇄","กฎความเข้ากัน"],
    ...(currentUser.isOwner?[["users","◎","ผู้ใช้งาน"]]:[]),
    ["audit","≡","Activity"],
    ["api","{}","API"]
  ];
  return <div className="admin-shell">
    <aside className="sidebar">
      <div className="brandmark"><b>B</b><div>BuildFit<small>DATA CONSOLE</small></div></div>
      <nav>
        {navigation.map(x=>
          <button key={x[0]} className={tab===x[0]?"active":""} onClick={()=>setTab(x[0])}>
            <span>{x[1]}</span>{x[2]}
          </button>)}
      </nav>
      <div className="sidebar-account"><span>{currentUser.username.slice(0,1).toUpperCase()}</span>
        <div><b>{currentUser.username}</b><small>{currentUser.isOwner?"บัญชีหลัก":"อนุมัติแล้ว"}</small></div>
        <button aria-label="ตั้งค่าบัญชี" title="ตั้งค่าบัญชี" onClick={()=>setAccountOpen(true)}>⚙</button>
        <button className="logout-button" aria-label="ออกจากระบบ" title="ออกจากระบบ" onClick={async()=>{
          await fetch("/api/auth/logout",{method:"POST"});window.location.assign("/login");
        }}><span aria-hidden="true">↗</span> ออกจากระบบ</button>
      </div>
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
              await cmsFetch(`/api/admin/products/${p.id}`,{method:"DELETE"});await load()
            }}}>ลบ</button></span>
        </div>)}</div>
      </section>}
      {tab==="attributes"&&<Attributes defs={defs} opts={opts} maps={maps} reload={load}/>}
      {tab==="rules"&&<Rules rules={rules} defs={defs} maps={maps} reload={load}/>}
      {tab==="users"&&currentUser.isOwner&&<UserManager currentUser={currentUser}/>}
      {tab==="audit"&&<AuditLog rows={audits}/>}
      {tab==="api"&&<section className="api-docs"><p>เปิด CORS พร้อมให้ frontend เรียกใช้</p>
        {["GET /api/v1/products?category=cpu&attr_socket=lga1700&page=1&limit=24","GET /api/v1/products/:slug",
          "GET /api/v1/schema","POST /api/v1/compatibility/check","GET /api/v1/images/:key"].map(x=>
          <div key={x}><code>{x}</code></div>)}
      </section>}
    </main>
    {editing&&<Editor product={editing} defs={defs} opts={opts} maps={maps}
      close={()=>setEditing(null)} save={save}/>}
    {accountOpen&&<AccountDialog user={currentUser} close={()=>setAccountOpen(false)}/>}
  </div>
}

function Editor({product:initial,defs,opts,maps,close,save}:{
  product:Product;defs:Def[];opts:Opt[];maps:MapRow[];
  close:()=>void;save:(p:Product)=>Promise<void>
}){
  useBodyScrollLock();
  const [p,setP]=useState(initial),[busy,setBusy]=useState(false);
  const [errors,setErrors]=useState<string[]>([]);
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  const [importText,setImportText]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);
  const formBodyRef=useRef<HTMLDivElement>(null);
  const active=useMemo(()=>maps.filter(m=>m.category===p.category)
    .sort((a,b)=>a.sort_order-b.sort_order)
    .map(map=>({map,def:defs.find(d=>d.id===map.attribute_id)}))
    .filter((item):item is {map:MapRow;def:Def}=>Boolean(item.def)),[p.category,defs,maps]);
  const set=(key:keyof Product,value:unknown)=>{
    setP(old=>({...old,[key]:value}));
    setFieldErrors(current=>{
      if(!current[key])return current;
      const next={...current};delete next[key];return next;
    });
  };
  function setAttribute(code:string,value:unknown){
    setP(old=>({...old,attributes:{...old.attributes,[code]:value}}));
    setFieldErrors(current=>{
      const key=`attr:${code}`;
      if(!current[key])return current;
      const next={...current};delete next[key];return next;
    });
  }
  function missing(value:unknown){
    if(Array.isArray(value))return value.length===0;
    return value===undefined||value===null||String(value).trim()==="";
  }
  function scrollToFirstError(){
    requestAnimationFrame(()=>{
      const first=formBodyRef.current?.querySelector<HTMLElement>(".field.invalid");
      first?.scrollIntoView({behavior:"smooth",block:"center"});
      first?.querySelector<HTMLElement>("input,textarea,button")?.focus({preventScroll:true});
    });
  }
  function importDetails(){
    const lines=importText.split("\n").map(line=>line.trim()).filter(Boolean);
    if(!lines.length)return;
    const next={...p};
    const description:string[]=[];
    for(const line of lines){
      const [rawKey,...rest]=line.split(":");
      const value=rest.join(":").trim();
      const key=rawKey.trim().toLowerCase();
      if(!value){description.push(line);continue}
      if(["name","title","ชื่อ","ชื่อสินค้า"].includes(key))next.title=value;
      else if(["brand","แบรนด์"].includes(key))next.brand=value;
      else if(["model","รุ่น"].includes(key))next.model=value;
      else if(["price","ราคา"].includes(key))next.price=Number(value.replace(/[^0-9.]/g,""))||next.price;
      else if(["shop","shopname","ร้าน"].includes(key))next.shopName=value;
      else if(["link","affiliate","affiliateurl","url"].includes(key))next.affiliateUrl=value;
      else description.push(line);
    }
    if(description.length)next.description=[next.description,description.join("\n")].filter(Boolean).join("\n\n");
    setP(next);setImportText("");
  }
  function validateLocal(){
    const next:Record<string,string>={};
    if(!p.brand.trim())next.brand=requiredMessage;
    if(!p.model.trim())next.model=requiredMessage;
    if(!p.title.trim())next.title=requiredMessage;
    if(Number(p.price)<0||!Number.isFinite(Number(p.price)))next.price="ราคาต้องเป็นตัวเลข 0 ขึ้นไป";
    if(p.affiliateUrl.trim()){
      try{
        const url=new URL(p.affiliateUrl.trim().replace(/^hhttps:\/\//i,"https://"));
        if(url.protocol!=="https:")next.affiliateUrl="Affiliate URL ต้องเป็น https";
      }catch{next.affiliateUrl="Affiliate URL ไม่ถูกต้อง"}
    }
    for(const {map,def} of active){
      if(Number(map.required)!==0&&missing(p.attributes[def.code])){
        next[`attr:${def.code}`]=requiredMessage;
      }
    }
    setFieldErrors(next);
    setErrors([]);
    if(Object.keys(next).length)scrollToFirstError();
    return Object.keys(next).length===0;
  }
  function moveImage(from:number,to:number){
    if(to<0||to>=p.images.length)return;
    const images=[...p.images];
    const [picked]=images.splice(from,1);
    images.splice(to,0,picked);
    set("images",images);
  }
  async function upload(files:FileList){
    setBusy(true);
    try{for(const file of Array.from(files)){
      const data=new FormData();data.append("file",file);
      const res=await cmsFetch("/api/admin/uploads",{method:"POST",body:data});
      const json=await res.json();if(!res.ok)throw Error(json.error);
      setP(old=>({...old,images:[...old.images,json.data.url]}));
    }}catch(e){alert(e instanceof Error?e.message:"Upload failed")}finally{setBusy(false)}
  }
  return <div className="scrim"><div className="drawer">
    <div className="drawer-head"><div><span className="eyebrow">{p.id?"EDIT PRODUCT":"NEW PRODUCT"}</span>
      <h2>{p.title||"เพิ่มสินค้าใหม่"}</h2></div><button className="close" onClick={close}>×</button></div>
    <div className="form-body" ref={formBodyRef}><h3>ข้อมูลหลัก</h3><div className="grid">
      <Field label="หมวดหมู่"><CustomSelect value={p.category} options={categoryOptions}
        onChange={value=>set("category",value)}/></Field>
      <Field label="สถานะ"><CustomSelect value={p.status} options={statusOptions}
        onChange={value=>set("status",value)}/></Field>
      <Field label="แบรนด์" required error={fieldErrors.brand}><input value={p.brand}
        onChange={e=>set("brand",e.target.value)}/></Field>
      <Field label="รุ่น" required error={fieldErrors.model}><input value={p.model}
        onChange={e=>set("model",e.target.value)}/></Field>
      <Field wide label="ชื่อสินค้า" required error={fieldErrors.title}><input value={p.title}
        onChange={e=>set("title",e.target.value)}/></Field>
      <Field wide label="คำอธิบายสั้น"><input value={p.shortDescription} onChange={e=>set("shortDescription",e.target.value)}/></Field>
      <Field wide label="รายละเอียด"><textarea rows={5} value={p.description} onChange={e=>set("description",e.target.value)}/></Field>
    </div><h3>ร้านค้า Affiliate</h3><div className="grid">
      <Field label="ชื่อร้าน"><input value={p.shopName} onChange={e=>set("shopName",e.target.value)}/></Field>
      <Field label="ราคา (บาท)" error={fieldErrors.price}><input type="number" value={p.price}
        onChange={e=>set("price",+e.target.value)}/></Field>
      <Field wide label="Affiliate URL" error={fieldErrors.affiliateUrl}><input value={p.affiliateUrl}
        onChange={e=>set("affiliateUrl",e.target.value)} placeholder="https://..."/></Field>
    </div><h3>รูปสินค้า</h3>
    <div className="dropzone" onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()}
      onDrop={e=>{e.preventDefault();void upload(e.dataTransfer.files)}}>
      <input ref={fileRef} hidden type="file" multiple accept="image/*" onChange={e=>e.target.files&&void upload(e.target.files)}/>
      <b>{busy?"กำลังอัปโหลด...":"วางรูปที่นี่ หรือคลิกเพื่อเลือก"}</b><small>JPG, PNG, WebP · สูงสุด 8 MB</small>
    </div><div className="quick-import">
      <textarea rows={4} value={importText} onChange={e=>setImportText(e.target.value)}
        placeholder={"วางข้อมูลสินค้าแบบเร็ว เช่น\nName: INTEL CPU...\nBrand: Intel\nPrice: 4190\nLink: https://..."}/>
      <button className="secondary" type="button" onClick={importDetails}>ดึงเข้าฟอร์ม</button>
    </div><div className="image-list">{p.images.map((src,i)=><div key={`${src}-${i}`} className={i===0?"cover":""}>
      <img src={src} alt=""/><small>{i===0?"Cover":`#${i+1}`}</small>
      <div className="image-actions">
        <button type="button" onClick={()=>moveImage(i,0)}>ปก</button>
        <button type="button" onClick={()=>moveImage(i,i-1)}>‹</button>
        <button type="button" onClick={()=>moveImage(i,i+1)}>›</button>
        <button type="button" onClick={()=>set("images",p.images.filter((_,n)=>n!==i))}>×</button>
      </div>
    </div>)}</div><h3>คุณสมบัติสำหรับ {p.category}</h3><div className="grid">
      {active.map(({map,def})=><Field key={def.id} label={def.label+(def.unit?` (${def.unit})`:"")}
        required={Number(map.required)!==0} error={fieldErrors[`attr:${def.code}`]}>
        <Attribute def={def} options={opts.filter(o=>o.attribute_id===def.id)}
          value={p.attributes[def.code]} change={v=>setAttribute(def.code,v)}/>
      </Field>)}
    </div>{errors.length>0&&<div className="form-errors">{errors.map(error=><span key={error}>{error}</span>)}</div>}</div><div className="drawer-foot"><button className="secondary" onClick={close}>ยกเลิก</button>
      <button className="primary" disabled={busy} onClick={async()=>{if(!validateLocal())return;setBusy(true);try{await save(p)}
        catch(e){setErrors([e instanceof Error?e.message:"ผิดพลาด"]);setBusy(false)}}}>บันทึกสินค้า</button>
    </div>
  </div></div>
}

function Attribute({def,options,value,change}:{def:Def;options:Opt[];value:unknown;change:(v:unknown)=>void}){
  if(def.value_type==="select")return <CustomSelect multiple={!!def.allow_multiple}
    value={def.allow_multiple?(Array.isArray(value)?value.map(String):[]):String(value??"")}
    options={options.map(o=>({value:o.value,label:o.label}))} onChange={change}/>;
  if(def.value_type==="boolean")return <CustomSelect value={String(value??"")}
    options={[{value:"true",label:"รองรับ"},{value:"false",label:"ไม่รองรับ"}]}
    onChange={selected=>change(selected==="true")}/>;
  return <input type={def.value_type==="number"?"number":"text"} value={String(value??"")}
    onChange={e=>change(def.value_type==="number"?+e.target.value:e.target.value)}/>
}

function CustomSelect({value,options,onChange,multiple=false,placeholder="เลือกข้อมูล"}:{
  value:string|string[];
  options:{value:string;label:string}[];
  onChange:(value:string|string[])=>void;
  multiple?:boolean;
  placeholder?:string
}){
  const [open,setOpen]=useState(false);
  const rootRef=useRef<HTMLDivElement>(null);
  const menuRef=useRef<HTMLDivElement>(null);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const listboxId=useId();
  const selected=multiple
    ? (Array.isArray(value)?value:[])
    : [Array.isArray(value)?"":value];
  const selectedLabels=options
    .filter(option=>selected.includes(option.value))
    .map(option=>option.label);

  useEffect(()=>{
    function dismiss(event:PointerEvent){
      if(!rootRef.current?.contains(event.target as Node))setOpen(false);
    }
    function escape(event:KeyboardEvent){
      if(event.key==="Escape")setOpen(false);
    }
    document.addEventListener("pointerdown",dismiss);
    document.addEventListener("keydown",escape);
    return()=>{
      document.removeEventListener("pointerdown",dismiss);
      document.removeEventListener("keydown",escape);
    };
  },[]);

  function focusOption(index:number){
    const items=Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("button")||[]
    );
    items[(index+items.length)%items.length]?.focus();
  }
  function toggle(next:string){
    if(multiple){
      onChange(selected.includes(next)
        ? selected.filter(item=>item!==next)
        : [...selected,next]);
      return;
    }
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const summary=selectedLabels.length
    ? multiple
      ? selectedLabels.slice(0,2).join(", ")+
        (selectedLabels.length>2?` +${selectedLabels.length-2}`:"")
      : selectedLabels[0]
    : placeholder;

  return <div className={`custom-select${open?" open":""}`} ref={rootRef}>
    <button ref={triggerRef} type="button" className="custom-select-trigger"
      aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId}
      onClick={()=>setOpen(current=>!current)}
      onKeyDown={event=>{
        if(event.key==="ArrowDown"){
          event.preventDefault();
          setOpen(true);
          requestAnimationFrame(()=>focusOption(Math.max(
            0,options.findIndex(option=>selected.includes(option.value))
          )));
        }
      }}>
      <span className={selectedLabels.length?"":"placeholder"}>{summary}</span>
      {multiple&&selectedLabels.length>0&&<small>{selectedLabels.length}</small>}
      <i aria-hidden="true"/>
    </button>
    {open&&<div ref={menuRef} id={listboxId}
      className="custom-select-menu" role="listbox"
      aria-multiselectable={multiple||undefined}>
      {options.map((option,index)=>{
        const active=selected.includes(option.value);
        return <button key={option.value} type="button" role="option"
          aria-selected={active} className={active?"selected":""}
          onClick={()=>toggle(option.value)}
          onKeyDown={event=>{
            if(event.key==="ArrowDown"||event.key==="ArrowUp"){
              event.preventDefault();
              focusOption(index+(event.key==="ArrowDown"?1:-1));
            }
            if(event.key==="Escape")triggerRef.current?.focus();
          }}>
          <span>{option.label}</span>
          <i aria-hidden="true">{active?"✓":""}</i>
        </button>
      })}
    </div>}
  </div>
}

function Field({label,wide,required,error,children}:{
  label:string;wide?:boolean;required?:boolean;error?:string;children:React.ReactNode
}){
  return <label className={`${wide?"field wide":"field"}${error?" invalid":""}`}>
    <span>{label}{required&&<b aria-label="จำเป็นต้องกรอก">*</b>}</span>{children}
    {error&&<small className="field-error">{error}</small>}
  </label>
}

function AccountDialog({user,close}:{user:CmsUser;close:()=>void}){
  useBodyScrollLock();
  const [currentPassword,setCurrentPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [showCurrentPassword,setShowCurrentPassword]=useState(false);
  const [showNewPassword,setShowNewPassword]=useState(false);
  const [showConfirmPassword,setShowConfirmPassword]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(event:React.FormEvent){
    event.preventDefault();setError("");
    if(newPassword!==confirmPassword){setError("ยืนยันรหัสผ่านไม่ตรงกัน");return}
    setBusy(true);
    try{
      const response=await cmsFetch("/api/auth/change-password",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({currentPassword,newPassword})
      });
      const body=await response.json();
      if(!response.ok)throw Error(body.error||"เปลี่ยนรหัสผ่านไม่สำเร็จ");
      window.location.assign("/login");
    }catch(reason){
      setError(reason instanceof Error?reason.message:"เปลี่ยนรหัสผ่านไม่สำเร็จ");
      setBusy(false);
    }
  }
  return <div className="admin-modal-backdrop"><form className="admin-modal account-modal"
    role="dialog" aria-modal="true" aria-labelledby="account-title" onSubmit={submit}>
    <header className="admin-modal-head"><div><span className="eyebrow">ACCOUNT SECURITY</span>
      <h2 id="account-title">{user.username}</h2>
      <p>เมื่อเปลี่ยนรหัสผ่าน ระบบจะออกจากระบบทุกอุปกรณ์โดยอัตโนมัติ</p>
    </div><button type="button" className="admin-modal-close" disabled={busy}
      onClick={close}>×</button></header>
    <div className="admin-modal-body account-fields">
      <div className="password-field"><input autoFocus aria-label="Current password"
        type={showCurrentPassword?"text":"password"} autoComplete="current-password"
        value={currentPassword} onChange={event=>setCurrentPassword(event.target.value)}
        placeholder="Current password" required/>
        <button type="button" aria-label={showCurrentPassword?"ซ่อนรหัสผ่านปัจจุบัน":"แสดงรหัสผ่านปัจจุบัน"}
          aria-pressed={showCurrentPassword} onClick={()=>setShowCurrentPassword(value=>!value)}>
          {showCurrentPassword?"ซ่อน":"แสดง"}
        </button>
      </div>
      <div className="password-field"><input aria-label="New password"
        type={showNewPassword?"text":"password"} autoComplete="new-password"
        value={newPassword} onChange={event=>setNewPassword(event.target.value)}
        placeholder="New password" required/>
        <button type="button" aria-label={showNewPassword?"ซ่อนรหัสผ่านใหม่":"แสดงรหัสผ่านใหม่"}
          aria-pressed={showNewPassword} onClick={()=>setShowNewPassword(value=>!value)}>
          {showNewPassword?"ซ่อน":"แสดง"}
        </button>
      </div>
      <div className="password-field"><input aria-label="Confirm password"
        type={showConfirmPassword?"text":"password"} autoComplete="new-password"
        value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)}
        placeholder="Confirm password" required/>
        <button type="button" aria-label={showConfirmPassword?"ซ่อนรหัสผ่านยืนยัน":"แสดงรหัสผ่านยืนยัน"}
          aria-pressed={showConfirmPassword} onClick={()=>setShowConfirmPassword(value=>!value)}>
          {showConfirmPassword?"ซ่อน":"แสดง"}
        </button>
      </div>
      {error&&<p className="modal-error">{error}</p>}
    </div>
    <footer className="admin-modal-foot"><button type="button" className="secondary"
      disabled={busy} onClick={close}>ยกเลิก</button><button className="primary"
      disabled={busy}>{busy?"กำลังเปลี่ยน...":"เปลี่ยนรหัสผ่าน"}</button></footer>
  </form></div>
}

type ManagedUser={
  id:string;username:string;status:"pending"|"active";created_at:string;
  approved_at:string|null;last_login_at:string|null;isOwner:boolean;
};

function UserManager({currentUser}:{currentUser:CmsUser}){
  const [users,setUsers]=useState<ManagedUser[]>([]);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [deleting,setDeleting]=useState<ManagedUser|null>(null);
  const load=useCallback(async()=>{
    const response=await cmsFetch("/api/admin/users");
    const body=await response.json();
    if(!response.ok)throw Error(body.error||"โหลดผู้ใช้ไม่สำเร็จ");
    setUsers(body.data||[]);
  },[]);
  useEffect(()=>{
    const timer=setTimeout(()=>void load().catch(reason=>
      setError(reason instanceof Error?reason.message:"โหลดผู้ใช้ไม่สำเร็จ")),0);
    return()=>clearTimeout(timer);
  },[load]);
  async function approve(user:ManagedUser){
    setBusy(user.id);setError("");
    try{
      const response=await cmsFetch(`/api/admin/users/${user.id}`,{method:"PATCH"});
      const body=await response.json();
      if(!response.ok)throw Error(body.error||"อนุมัติไม่สำเร็จ");
      await load();
    }catch(reason){setError(reason instanceof Error?reason.message:"อนุมัติไม่สำเร็จ")}
    finally{setBusy("")}
  }
  async function remove(user:ManagedUser){
    setBusy(user.id);setError("");
    try{
      const response=await cmsFetch(`/api/admin/users/${user.id}`,{method:"DELETE"});
      const body=await response.json();
      if(!response.ok)throw Error(body.error||"ลบไม่สำเร็จ");
      setDeleting(null);await load();
    }catch(reason){setError(reason instanceof Error?reason.message:"ลบไม่สำเร็จ")}
    finally{setBusy("")}
  }
  const pending=users.filter(user=>user.status==="pending").length;
  return <section>
    <div className="section-bar users-summary"><div>
      <p>เฉพาะบัญชีที่ {currentUser.username} อนุมัติเท่านั้นที่เข้าสู่ CMS ได้</p>
      <strong>{pending} คำขอรออนุมัติ</strong>
    </div></div>
    {error&&<p className="modal-error">{error}</p>}
    <div className="users-list">
      {users.map(user=><article key={user.id}>
        <div className="user-avatar">{user.username.slice(0,1).toUpperCase()}</div>
        <div className="user-main"><b>{user.username}</b>
          <small>สมัครเมื่อ {formatUserDate(user.created_at)}
            {user.last_login_at?` · เข้าใช้ล่าสุด ${formatUserDate(user.last_login_at)}`:""}</small>
        </div>
        <span className={`user-state ${user.status}`}>
          {user.isOwner?"บัญชีหลัก":user.status==="pending"?"รออนุมัติ":"ใช้งานได้"}
        </span>
        {!user.isOwner&&<div className="user-actions">
          {user.status==="pending"&&!user.isOwner&&<button className="approve-user"
            disabled={busy===user.id} onClick={()=>void approve(user)}>อนุมัติ</button>}
          {!user.isOwner&&<button className="delete-user" disabled={busy===user.id}
            onClick={()=>setDeleting(user)}>ลบ</button>}
        </div>}
      </article>)}
    </div>
    {deleting&&<DeleteUserDialog user={deleting} busy={busy===deleting.id}
      close={()=>setDeleting(null)} remove={()=>void remove(deleting)}/>}
  </section>
}

function DeleteUserDialog({user,busy,close,remove}:{
  user:ManagedUser;busy:boolean;close:()=>void;remove:()=>void
}){
  useBodyScrollLock();
  return <div className="admin-modal-backdrop" onMouseDown={event=>{
    if(event.target===event.currentTarget&&!busy)close();
  }}>
    <div className="admin-modal confirm-user-modal" role="alertdialog" aria-modal="true"
      aria-labelledby="delete-user-title">
      <header className="admin-modal-head"><div><span className="eyebrow">REMOVE ACCESS</span>
        <h2 id="delete-user-title">ลบบัญชี {user.username}?</h2>
        <p>ผู้ใช้นี้จะออกจากระบบและไม่สามารถเข้าถึง CMS ได้ทันที</p>
      </div><button className="admin-modal-close" disabled={busy} onClick={close}>×</button></header>
      <footer className="admin-modal-foot"><button className="secondary" disabled={busy}
        onClick={close}>ยกเลิก</button><button className="danger-action" disabled={busy}
        onClick={remove}>{busy?"กำลังลบ...":"ลบบัญชี"}</button></footer>
    </div>
  </div>
}

function formatUserDate(value:string){
  return new Intl.DateTimeFormat("th-TH",{dateStyle:"medium"}).format(new Date(value));
}

function AuditLog({rows}:{rows:AuditRow[]}){
  return <section><div className="section-bar"><p>ประวัติ action ล่าสุดใน CMS</p></div>
    <div className="audit-list">{rows.map(row=><article key={row.id}>
      <span>{row.action}</span><div><b>{row.target_type} · {row.summary||row.target_id}</b>
        <p>{row.actor} · {formatUserDate(row.created_at)}</p></div>
    </article>)}</div>
  </section>
}

function Rules({rules,defs,maps,reload}:{
  rules:Rule[];defs:Def[];maps:MapRow[];reload:()=>Promise<void>
}){
  const [dialog,setDialog]=useState<Rule|null|false>(false);
  async function remove(rule:Rule){
    if(!confirm("ลบกฎนี้?"))return;
    await cmsFetch(`/api/admin/rules/${rule.id}`,{method:"DELETE"});
    await reload();
  }
  return <section><div className="section-bar"><p>กฎที่ใช้คำนวณคะแนนความเข้ากันได้</p>
    <button className="primary" onClick={()=>setDialog(null)}>+ เพิ่มกฎ</button></div>
    <div className="rules-list">{rules.map(r=><article key={r.id}
      className={Number(r.active)===0?"inactive":""}>
      <span>{r.severity}</span><div><b>{r.left_category}.{r.left_attribute_code} {r.operator} {r.right_category}.{r.right_attribute_code}</b>
      <p>{r.message}</p></div><div className="rule-actions">
        <button onClick={()=>setDialog(r)}>แก้ไข</button>
        <button onClick={()=>void remove(r)}>ลบ</button>
      </div></article>)}</div>
    {dialog!==false&&<RuleDialog rule={dialog} defs={defs} maps={maps}
      close={()=>setDialog(false)} saved={reload}/>}
  </section>
}

function RuleDialog({rule,defs,maps,close,saved}:{
  rule:Rule|null;defs:Def[];maps:MapRow[];close:()=>void;saved:()=>Promise<void>
}){
  useBodyScrollLock();
  const [leftCategory,setLeftCategory]=useState(rule?.left_category??"cpu");
  const [rightCategory,setRightCategory]=useState(rule?.right_category??"motherboard");
  const [leftAttribute,setLeftAttribute]=useState(rule?.left_attribute_code??"");
  const [rightAttribute,setRightAttribute]=useState(rule?.right_attribute_code??"");
  const [operator,setOperator]=useState(rule?.operator??"overlaps");
  const [severity,setSeverity]=useState(rule?.severity??"error");
  const [message,setMessage]=useState(rule?.message??"");
  const [active,setActive]=useState(rule?Number(rule.active)!==0:true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const attributeOptions=(category:string)=>maps.filter(map=>map.category===category)
    .sort((a,b)=>a.sort_order-b.sort_order)
    .map(map=>defs.find(def=>def.id===map.attribute_id))
    .filter(Boolean)
    .map(def=>({value:(def as Def).code,label:(def as Def).label}));
  async function submit(event:React.FormEvent){
    event.preventDefault();setError("");setBusy(true);
    try{
      const response=await cmsFetch(rule?`/api/admin/rules/${rule.id}`:"/api/admin/rules",{
        method:rule?"PATCH":"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({leftCategory,leftAttribute,operator,rightCategory,rightAttribute,severity,message,active})
      });
      const body=await response.json();
      if(!response.ok)throw Error(body.error||"บันทึกกฎไม่สำเร็จ");
      await saved();close();
    }catch(reason){
      setError(reason instanceof Error?reason.message:"บันทึกกฎไม่สำเร็จ");
    }finally{setBusy(false)}
  }
  return <div className="admin-modal-backdrop" onMouseDown={event=>{
    if(event.target===event.currentTarget&&!busy)close();
  }}>
    <form className="admin-modal rule-modal" role="dialog" aria-modal="true"
      aria-labelledby="rule-dialog-title" onSubmit={submit}>
      <header className="admin-modal-head"><div><span className="eyebrow">COMPATIBILITY RULE</span>
        <h2 id="rule-dialog-title">{rule?"แก้ไขกฎ":"เพิ่มกฎใหม่"}</h2>
        <p>เลือก attribute สองฝั่งเพื่อให้ frontend ใช้กรองและประเมินคะแนนสเปก</p>
      </div><button type="button" className="admin-modal-close" disabled={busy}
        onClick={close}>×</button></header>
      <div className="admin-modal-body">
        <div className="modal-grid">
          <Field label="หมวดฝั่งซ้าย"><CustomSelect value={leftCategory}
            options={categoryOptions} onChange={value=>{setLeftCategory(String(value));setLeftAttribute("")}}/></Field>
          <Field label="Attribute ฝั่งซ้าย"><CustomSelect value={leftAttribute}
            options={attributeOptions(leftCategory)} onChange={value=>setLeftAttribute(String(value))}/></Field>
          <Field label="เงื่อนไข"><CustomSelect value={operator}
            options={[
              {value:"equals",label:"ต้องเท่ากัน"},
              {value:"overlaps",label:"มีค่าซ้ำกัน"},
              {value:"lte",label:"ฝั่งซ้ายน้อยกว่าหรือเท่ากับ"}
            ]} onChange={value=>setOperator(String(value))}/></Field>
          <Field label="ระดับผลกระทบ"><CustomSelect value={severity}
            options={[{value:"error",label:"Error"},{value:"warning",label:"Warning"}]}
            onChange={value=>setSeverity(String(value))}/></Field>
          <Field label="หมวดฝั่งขวา"><CustomSelect value={rightCategory}
            options={categoryOptions} onChange={value=>{setRightCategory(String(value));setRightAttribute("")}}/></Field>
          <Field label="Attribute ฝั่งขวา"><CustomSelect value={rightAttribute}
            options={attributeOptions(rightCategory)} onChange={value=>setRightAttribute(String(value))}/></Field>
          <Field wide label="ข้อความแจ้งเตือน"><input value={message}
            onChange={event=>setMessage(event.target.value)}
            placeholder="เช่น CPU socket ไม่ตรงกับเมนบอร์ด"/></Field>
        </div>
        <div className="modal-settings"><label><span><strong>เปิดใช้งานกฎนี้</strong>
          <small>ปิดไว้ได้ถ้ายังไม่อยากให้ frontend นำไปคิดคะแนน</small></span>
          <input type="checkbox" checked={active} onChange={event=>setActive(event.target.checked)}/><i/></label></div>
        {error&&<p className="modal-error">{error}</p>}
      </div>
      <footer className="admin-modal-foot"><button className="secondary" type="button"
        disabled={busy} onClick={close}>ยกเลิก</button><button className="primary"
        disabled={busy||!leftAttribute||!rightAttribute||!message.trim()}>
        {busy?"กำลังบันทึก...":"บันทึกกฎ"}</button></footer>
    </form>
  </div>
}

type AttributeDialogState=
  |{kind:"definition";definition?:Def}
  |{kind:"option";definition:Def;option?:Opt};

function AttributeDialog({state,close,saved,maps}:{
  state:AttributeDialogState;close:()=>void;saved:()=>Promise<void>;maps:MapRow[]
}){
  useBodyScrollLock();
  const isDefinition=state.kind==="definition";
  const editingDefinition=isDefinition?state.definition:undefined;
  const editingOption=state.kind==="option"?state.option:undefined;
  const [label,setLabel]=useState(editingDefinition?.label??"");
  const [code,setCode]=useState(editingDefinition?.code??"");
  const [valueType,setValueType]=useState(editingDefinition?.value_type??"select");
  const [unit,setUnit]=useState(editingDefinition?.unit??"");
  const [selectedCategories,setSelectedCategories]=useState<string[]>(
    editingDefinition?maps.filter(m=>m.attribute_id===editingDefinition.id).map(m=>m.category):[]
  );
  const [allowMultiple,setAllowMultiple]=useState(Boolean(editingDefinition?.allow_multiple));
  const [compatibility,setCompatibility]=useState(Boolean(editingDefinition?.use_for_compatibility));
  const [optionValue,setOptionValue]=useState(editingOption?.value??"");
  const [optionLabel,setOptionLabel]=useState(editingOption?.label??"");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  function toggleCategory(category:string){
    setSelectedCategories(current=>current.includes(category)
      ? current.filter(item=>item!==category)
      : [...current,category]);
  }
  async function submit(event:React.FormEvent){
    event.preventDefault();setError("");setBusy(true);
    try{
      const endpoint=isDefinition
        ? editingDefinition?`/api/admin/attributes/${editingDefinition.id}`:"/api/admin/attributes"
        : editingOption?`/api/admin/attributes/${state.definition.id}/options/${editingOption.id}`
          : `/api/admin/attributes/${state.definition.id}/options`;
      const method=isDefinition
        ? editingDefinition?"PATCH":"POST"
        : editingOption?"PATCH":"POST";
      const payload=isDefinition
        ? {label,code,valueType,unit,allowMultiple,useForCompatibility:compatibility,
          categories:selectedCategories}
        : {value:optionValue,label:optionLabel||optionValue};
      const response=await cmsFetch(endpoint,{method,headers:{"content-type":"application/json"},
        body:JSON.stringify(payload)});
      const body=await response.json();
      if(!response.ok)throw Error(body.error||"บันทึกไม่สำเร็จ");
      await saved();close();
    }catch(reason){
      setError(reason instanceof Error?reason.message:"บันทึกไม่สำเร็จ");
    }finally{setBusy(false)}
  }

  const canSubmit=isDefinition
    ? Boolean(label.trim()&&code.trim()&&selectedCategories.length)
    : Boolean(optionValue.trim());
  return <div className="admin-modal-backdrop" onMouseDown={event=>{
    if(event.target===event.currentTarget)close();
  }} onKeyDown={event=>{if(event.key==="Escape")close()}}>
    <form className="admin-modal" role="dialog" aria-modal="true"
      aria-labelledby="attribute-dialog-title" onSubmit={submit}>
      <header className="admin-modal-head"><div>
        <span className="eyebrow">{isDefinition
          ? editingDefinition?"EDIT ATTRIBUTE":"NEW ATTRIBUTE"
          : editingOption?"EDIT OPTION":"NEW OPTION"}</span>
        <h2 id="attribute-dialog-title">{isDefinition
          ? editingDefinition?"แก้ไขชนิดข้อมูล":"เพิ่มชนิดข้อมูล"
          : `${editingOption?"แก้ไข":"เพิ่ม"}ตัวเลือก · ${state.definition.label}`}</h2>
        <p>{isDefinition
          ? "กำหนดข้อมูลหนึ่งครั้ง แล้วนำไปใช้กับสินค้าและระบบตรวจความเข้ากันได้"
          : "Value ใช้เก็บใน API ส่วนชื่อแสดงผลใช้ในหน้า Admin และหน้าร้าน"}</p>
      </div><button className="admin-modal-close" type="button" onClick={close}
        aria-label="ปิดหน้าต่าง">×</button></header>

      <div className="admin-modal-body">{isDefinition?<>
        <div className="modal-grid">
          <Field label="ชื่อคุณสมบัติ"><input autoFocus value={label}
            onChange={event=>setLabel(event.target.value)} placeholder="เช่น Socket"/></Field>
          <Field label="Code สำหรับ API"><input value={code}
            onChange={event=>setCode(event.target.value.toLowerCase().replace(/\s+/g,"_"))}
            placeholder="เช่น socket"/></Field>
          <Field label="ประเภทข้อมูล"><CustomSelect value={valueType}
            options={[
              {value:"select",label:"ตัวเลือก"},{value:"text",label:"ข้อความ"},
              {value:"number",label:"ตัวเลข"},{value:"boolean",label:"ใช่ / ไม่ใช่"}
            ]} onChange={value=>setValueType(String(value))}/></Field>
          <Field label="หน่วย (ถ้ามี)"><input value={unit}
            onChange={event=>setUnit(event.target.value)} placeholder="GB, W, mm"/></Field>
        </div>
        <div className="modal-section"><div className="modal-section-title">
          <div><strong>ใช้กับหมวดสินค้า</strong><span>เลือกได้มากกว่าหนึ่งหมวด</span></div>
          <small>{selectedCategories.length} หมวด</small></div>
          <div className="category-picker">{categoryOptions.map(option=>{
            const active=selectedCategories.includes(option.value);
            return <button key={option.value} type="button"
              className={active?"active":""} aria-pressed={active}
              onClick={()=>toggleCategory(option.value)}>
              <i>{active?"✓":"+"}</i>{option.label}
            </button>
          })}</div>
        </div>
        <div className="modal-settings">
          <label><span><strong>เลือกได้หลายค่า</strong>
            <small>เช่น CPU รองรับ DDR4 และ DDR5</small></span>
            <input type="checkbox" checked={allowMultiple}
              disabled={valueType!=="select"}
              onChange={event=>setAllowMultiple(event.target.checked)}/><i/></label>
          <label><span><strong>ใช้ตรวจ Compatibility</strong>
            <small>นำค่านี้ไปใช้สร้างกฎความเข้ากันได้</small></span>
            <input type="checkbox" checked={compatibility}
              onChange={event=>setCompatibility(event.target.checked)}/><i/></label>
        </div>
      </>:<div className="modal-grid">
        <Field label="Value สำหรับ API"><input autoFocus value={optionValue}
          onChange={event=>setOptionValue(event.target.value.toLowerCase().replace(/\s+/g,"_"))}
          placeholder="เช่น lga1700"/></Field>
        <Field label="ชื่อแสดงผล"><input value={optionLabel}
          onChange={event=>setOptionLabel(event.target.value)} placeholder="เช่น LGA1700"/></Field>
      </div>}
      {error&&<p className="modal-error">{error}</p>}</div>

      <footer className="admin-modal-foot"><button className="secondary" type="button"
        onClick={close}>ยกเลิก</button><button className="primary" type="submit"
        disabled={!canSubmit||busy}>{busy?"กำลังบันทึก...":"บันทึกข้อมูล"}</button></footer>
    </form>
  </div>
}

function Attributes({defs,opts,maps,reload}:{defs:Def[];opts:Opt[];maps:MapRow[];reload:()=>Promise<void>}){
  const [dialog,setDialog]=useState<AttributeDialogState|null>(null);
  async function removeDefinition(def:Def){
    if(!confirm(`ลบคุณสมบัติ ${def.label}?`))return;
    await cmsFetch(`/api/admin/attributes/${def.id}`,{method:"DELETE"});
    await reload();
  }
  async function removeOption(def:Def,opt:Opt){
    if(!confirm(`ลบตัวเลือก ${opt.label}?`))return;
    await cmsFetch(`/api/admin/attributes/${def.id}/options/${opt.id}`,{method:"DELETE"});
    await reload();
  }
  return <section><div className="section-bar"><p>ใช้ข้อมูลชุดเดียวทั้งการแสดงผลและแมปการรองรับ</p>
    <button className="primary" onClick={()=>setDialog({kind:"definition"})}>+ เพิ่มคุณสมบัติ</button></div>
    <div className="card-grid">{defs.map(d=><article className="attribute-card" key={d.id}>
      <div className="attribute-card-head"><span className="type">{d.value_type}</span>
        <span><button onClick={()=>setDialog({kind:"definition",definition:d})}>แก้ไข</button>
        <button onClick={()=>void removeDefinition(d)}>ลบ</button></span></div>
      <h3>{d.label}</h3><code>{d.code}</code>
      <p>{maps.filter(m=>m.attribute_id===d.id).map(m=>m.category).join(" · ")}</p>
      {d.value_type==="select"&&<div className="chips">{opts.filter(o=>o.attribute_id===d.id)
        .map(o=><span key={o.id} className="chip-option">{o.label}
          <button onClick={()=>setDialog({kind:"option",definition:d,option:o})}>แก้</button>
          <button onClick={()=>void removeOption(d,o)}>×</button></span>)}<button
          onClick={()=>setDialog({kind:"option",definition:d})}>+ เพิ่มตัวเลือก</button></div>}
    </article>)}</div>
    {dialog&&<AttributeDialog state={dialog} close={()=>setDialog(null)} saved={reload} maps={maps}/>}
  </section>
}
