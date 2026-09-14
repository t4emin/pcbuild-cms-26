import Link from "next/link";

export default function Home() {
  return <main className="service-page"><div className="service-card">
    <span className="eyebrow">BUILDFIT BACKEND</span>
    <h1>Product data that understands PC parts.</h1>
    <p>API สำหรับสินค้า Affiliate, คุณสมบัติแบบยืดหยุ่น และการตรวจความเข้ากันได้ของสเปก</p>
    <div className="service-actions"><Link className="primary" href="/admin">เปิด Admin console</Link><a className="secondary" href="/api/v1/health">API health</a></div>
    <div className="endpoint"><i /> GET /api/v1/products</div>
  </div></main>;
}
