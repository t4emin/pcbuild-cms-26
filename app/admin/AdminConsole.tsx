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
type Def={id:string;code:string;label:string;value_type:string;allow_multiple:number;unit?:string};
type Opt={id:string;attribute_id:string;value:string;label:string};
type MapRow={category:string;attribute_id:string;sort_order:number};
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
  const [rules,setRules]=useState<Record<string,string>[]>([]);
  const [editing,setEditing]=useState<Product|null>(null);
  const [accountOpen,setAccountOpen]=useState(false);
  const [query,setQuery]=useState("");
  const load=useCallback(async()=>{
    const [p,a,r]=await Promise.all([
      cmsFetch("/api/admin/products").then(x=>x.json()),
      cmsFetch("/api/admin/attributes").then(x=>x.json()),
      cmsFetch("/api/admin/rules").then(x=>x.json())
    ]);
    setProducts(p.data||[]); setDefs(a.data?.definitions||[]);
    setOpts(a.data?.options||[]); setMaps(a.data?.categoryAttributes||[]);
    setRules(r.data||[]);
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
    users:"ผู้ใช้งาน",api:"Public API"
  };
  const navigation=[
    ["products","◫","สินค้า"],["attributes","⌘","คุณสมบัติ"],
    ["rules","⇄","กฎความเข้ากัน"],
    ...(currentUser.isOwner?[["users","◎","ผู้ใช้งาน"]]:[]),
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
      {tab==="rules"&&<section><div className="section-bar"><p>กฎที่ใช้คำนวณคะแนนความเข้ากันได้</p></div>
        <div className="rules-list">{rules.map(r=><article key={r.id}>
          <span>{r.severity}</span><div><b>{r.left_category}.{r.left_attribute_code} {r.operator} {r.right_category}.{r.right_attribute_code}</b>
          <p>{r.message}</p></div></article>)}</div></section>}
      {tab==="users"&&currentUser.isOwner&&<UserManager currentUser={currentUser}/>}
      {tab==="api"&&<section className="api-docs"><p>เปิด CORS พร้อมให้ frontend เรียกใช้</p>
        {["GET /api/v1/products?category=cpu&sort=price_asc","GET /api/v1/products/:slug",
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
  const fileRef=useRef<HTMLInputElement>(null);
  const active=useMemo(()=>maps.filter(m=>m.category===p.category)
    .sort((a,b)=>a.sort_order-b.sort_order).map(m=>defs.find(d=>d.id===m.attribute_id))
    .filter(Boolean) as Def[],[p.category,defs,maps]);
  const set=(key:keyof Product,value:unknown)=>setP(old=>({...old,[key]:value}));
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
    <div className="form-body"><h3>ข้อมูลหลัก</h3><div className="grid">
      <Field label="หมวดหมู่"><CustomSelect value={p.category} options={categoryOptions}
        onChange={value=>set("category",value)}/></Field>
      <Field label="สถานะ"><CustomSelect value={p.status} options={statusOptions}
        onChange={value=>set("status",value)}/></Field>
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

function Field({label,wide,children}:{label:string;wide?:boolean;children:React.ReactNode}){
  return <label className={wide?"field wide":"field"}><span>{label}</span>{children}</label>
}

function AccountDialog({user,close}:{user:CmsUser;close:()=>void}){
  useBodyScrollLock();
  const [currentPassword,setCurrentPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
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
      <Field label="รหัสผ่านปัจจุบัน"><input autoFocus type="password"
        autoComplete="current-password" value={currentPassword}
        onChange={event=>setCurrentPassword(event.target.value)} required/></Field>
      <Field label="รหัสผ่านใหม่"><input type="password" autoComplete="new-password"
        value={newPassword} onChange={event=>setNewPassword(event.target.value)}
        placeholder="อย่างน้อย 10 ตัวอักษร" required/></Field>
      <Field label="ยืนยันรหัสผ่านใหม่"><input type="password" autoComplete="new-password"
        value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} required/></Field>
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

type AttributeDialogState={kind:"definition"}|{kind:"option";definition:Def};

function AttributeDialog({state,close,saved}:{
  state:AttributeDialogState;close:()=>void;saved:()=>Promise<void>
}){
  useBodyScrollLock();
  const isDefinition=state.kind==="definition";
  const [label,setLabel]=useState("");
  const [code,setCode]=useState("");
  const [valueType,setValueType]=useState("select");
  const [unit,setUnit]=useState("");
  const [selectedCategories,setSelectedCategories]=useState<string[]>([]);
  const [allowMultiple,setAllowMultiple]=useState(false);
  const [compatibility,setCompatibility]=useState(false);
  const [optionValue,setOptionValue]=useState("");
  const [optionLabel,setOptionLabel]=useState("");
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
        ? "/api/admin/attributes"
        : `/api/admin/attributes/${state.definition.id}/options`;
      const payload=isDefinition
        ? {label,code,valueType,unit,allowMultiple,useForCompatibility:compatibility,
          categories:selectedCategories}
        : {value:optionValue,label:optionLabel||optionValue};
      const response=await cmsFetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},
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
        <span className="eyebrow">{isDefinition?"NEW ATTRIBUTE":"NEW OPTION"}</span>
        <h2 id="attribute-dialog-title">{isDefinition
          ? "เพิ่มชนิดข้อมูล"
          : `เพิ่มตัวเลือก · ${state.definition.label}`}</h2>
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
  return <section><div className="section-bar"><p>ใช้ข้อมูลชุดเดียวทั้งการแสดงผลและแมปการรองรับ</p>
    <button className="primary" onClick={()=>setDialog({kind:"definition"})}>+ เพิ่มคุณสมบัติ</button></div>
    <div className="card-grid">{defs.map(d=><article className="attribute-card" key={d.id}>
      <span className="type">{d.value_type}</span><h3>{d.label}</h3><code>{d.code}</code>
      <p>{maps.filter(m=>m.attribute_id===d.id).map(m=>m.category).join(" · ")}</p>
      {d.value_type==="select"&&<div className="chips">{opts.filter(o=>o.attribute_id===d.id)
        .map(o=><span key={o.id}>{o.label}</span>)}<button
          onClick={()=>setDialog({kind:"option",definition:d})}>+ เพิ่มตัวเลือก</button></div>}
    </article>)}</div>
    {dialog&&<AttributeDialog state={dialog} close={()=>setDialog(null)} saved={reload}/>}
  </section>
}
