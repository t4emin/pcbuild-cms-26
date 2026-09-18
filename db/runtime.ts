import { env } from "cloudflare:workers";

let initialization: Promise<void> | null = null;

const attributes = [
  ["attr_socket", "socket", "Socket", "select", 0, null, 1],
  ["attr_memory_type", "memory_type", "Memory support", "select", 1, null, 1],
  ["attr_cores", "cores", "Cores", "number", 0, null, 0],
  ["attr_threads", "threads", "Threads", "number", 0, null, 0],
  ["attr_p_cores", "p_cores", "Performance cores", "number", 0, null, 0],
  ["attr_e_cores", "e_cores", "Efficient cores", "number", 0, null, 0],
  ["attr_base_clock", "base_clock_ghz", "P-core base clock", "number", 0, "GHz", 0],
  ["attr_boost_clock", "boost_clock_ghz", "Max turbo frequency", "number", 0, "GHz", 0],
  ["attr_cache", "cache_mb", "Intel Smart Cache", "number", 0, "MB", 0],
  ["attr_tdp_w", "tdp_w", "TDP", "number", 0, "W", 0],
  ["attr_turbo_power", "max_turbo_power_w", "Maximum turbo power", "number", 0, "W", 0],
  ["attr_integrated_graphics", "integrated_graphics", "Integrated graphics", "boolean", 0, null, 0],
  ["attr_cooler_included", "cooler_included", "Cooler included", "boolean", 0, null, 0],
  ["attr_chipset", "chipset", "Chipset", "text", 0, null, 0],
  ["attr_form_factor", "form_factor", "Form factor", "select", 0, null, 1],
  ["attr_supported_mb", "supported_mainboard_form_factors", "Mainboard support", "select", 1, null, 1],
  ["attr_vram_gb", "vram_gb", "VRAM", "number", 0, "GB", 0],
  ["attr_gpu_chip_vendor", "gpu_chip_vendor", "GPU chip vendor", "select", 0, null, 0],
  ["attr_gpu_card_brand", "gpu_card_brand", "GPU card brand", "select", 0, null, 0],
  ["attr_gpu_series", "gpu_series", "GPU series", "select", 0, null, 0],
  ["attr_gpu_length", "length_mm", "GPU length", "number", 0, "mm", 1],
  ["attr_max_gpu", "max_gpu_length_mm", "Max GPU length", "number", 0, "mm", 1],
  ["attr_psu_recommended", "recommended_psu_w", "Recommended PSU", "number", 0, "W", 1],
  ["attr_wattage", "wattage", "Wattage", "number", 0, "W", 1],
  ["attr_capacity", "capacity_gb", "Capacity", "number", 0, "GB", 0],
  ["attr_storage_type", "storage_type", "Drive type", "select", 0, null, 0],
  ["attr_storage_form", "storage_form_factor", "Drive form factor", "select", 0, null, 0],
  ["attr_interface", "interface", "Interface", "select", 0, null, 1],
  ["attr_cooler_sockets", "supported_sockets", "Supported sockets", "select", 1, null, 1],
] as const;

const options = [
  ["opt_am5", "attr_socket", "am5", "AM5"],
  ["opt_lga1700", "attr_socket", "lga1700", "LGA1700"],
  ["opt_lga1851", "attr_socket", "lga1851", "LGA1851"],
  ["opt_ddr4", "attr_memory_type", "ddr4", "DDR4"],
  ["opt_ddr5", "attr_memory_type", "ddr5", "DDR5"],
  ["opt_atx", "attr_form_factor", "atx", "ATX"],
  ["opt_matx", "attr_form_factor", "matx", "mATX"],
  ["opt_itx", "attr_form_factor", "itx", "Mini-ITX"],
  ["opt_support_atx", "attr_supported_mb", "atx", "ATX"],
  ["opt_support_matx", "attr_supported_mb", "matx", "mATX"],
  ["opt_support_itx", "attr_supported_mb", "itx", "Mini-ITX"],
  ["opt_nvme", "attr_interface", "nvme", "NVMe"],
  ["opt_sata", "attr_interface", "sata", "SATA"],
  ["opt_storage_hdd", "attr_storage_type", "hdd", "HDD"],
  ["opt_storage_ssd", "attr_storage_type", "ssd", "SSD"],
  ["opt_storage_m2", "attr_storage_form", "m2", "M.2"],
  ["opt_storage_25", "attr_storage_form", "2.5-inch", "2.5 inch"],
  ["opt_storage_35", "attr_storage_form", "3.5-inch", "3.5 inch"],
  ["opt_gpu_vendor_nvidia", "attr_gpu_chip_vendor", "nvidia", "NVIDIA"],
  ["opt_gpu_vendor_amd", "attr_gpu_chip_vendor", "amd", "AMD"],
  ["opt_gpu_vendor_intel", "attr_gpu_chip_vendor", "intel", "Intel"],
  ["opt_gpu_brand_asus", "attr_gpu_card_brand", "asus", "ASUS"],
  ["opt_gpu_brand_msi", "attr_gpu_card_brand", "msi", "MSI"],
  ["opt_gpu_brand_gigabyte", "attr_gpu_card_brand", "gigabyte", "Gigabyte"],
  ["opt_gpu_brand_zotac", "attr_gpu_card_brand", "zotac", "ZOTAC"],
  ["opt_gpu_brand_sapphire", "attr_gpu_card_brand", "sapphire", "Sapphire"],
  ["opt_gpu_brand_powercolor", "attr_gpu_card_brand", "powercolor", "PowerColor"],
  ["opt_gpu_brand_palit", "attr_gpu_card_brand", "palit", "Palit"],
  ["opt_gpu_series_rtx_5000", "attr_gpu_series", "rtx-5000", "RTX 5000 Series"],
  ["opt_gpu_series_rtx_4000", "attr_gpu_series", "rtx-4000", "RTX 4000 Series"],
  ["opt_gpu_series_rx_9000", "attr_gpu_series", "rx-9000", "Radeon RX 9000 Series"],
  ["opt_gpu_series_rx_7000", "attr_gpu_series", "rx-7000", "Radeon RX 7000 Series"],
  ["opt_gpu_series_arc_b", "attr_gpu_series", "arc-b", "Intel Arc B-Series"],
  ["opt_cooler_am5", "attr_cooler_sockets", "am5", "AM5"],
  ["opt_cooler_lga1700", "attr_cooler_sockets", "lga1700", "LGA1700"],
  ["opt_cooler_lga1851", "attr_cooler_sockets", "lga1851", "LGA1851"],
] as const;

const categoryMap: Record<string, Array<[string, boolean]>> = {
  cpu: [["attr_socket", true], ["attr_memory_type", true], ["attr_cores", false], ["attr_threads", false], ["attr_p_cores", false], ["attr_e_cores", false], ["attr_base_clock", false], ["attr_boost_clock", false], ["attr_cache", false], ["attr_tdp_w", false], ["attr_turbo_power", false], ["attr_integrated_graphics", false], ["attr_cooler_included", false]],
  motherboard: [["attr_socket", true], ["attr_memory_type", true], ["attr_chipset", false], ["attr_form_factor", true]],
  gpu: [["attr_gpu_chip_vendor", true], ["attr_gpu_card_brand", false], ["attr_gpu_series", false], ["attr_vram_gb", false], ["attr_gpu_length", false], ["attr_psu_recommended", true], ["attr_tdp_w", false]],
  memory: [["attr_memory_type", true], ["attr_capacity", false]],
  storage: [
    ["attr_storage_type", true],
    ["attr_storage_form", true],
    ["attr_interface", true],
    ["attr_capacity", false]
  ],
  psu: [["attr_wattage", true]],
  case: [["attr_supported_mb", true], ["attr_max_gpu", false]],
  cooler: [["attr_cooler_sockets", true]],
};

export function getD1() {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export async function ensureDb() {
  if (!initialization) initialization = initialize();
  await initialization;
}

async function initialize() {
  const db = getD1();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, category TEXT NOT NULL, brand TEXT NOT NULL, model TEXT NOT NULL, title TEXT NOT NULL, short_description TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL DEFAULT 0, affiliate_url TEXT NOT NULL DEFAULT '', shop_name TEXT NOT NULL DEFAULT '', images TEXT NOT NULL DEFAULT '[]', attributes TEXT NOT NULL DEFAULT '{}', performance_score INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS attribute_definitions (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, label TEXT NOT NULL, value_type TEXT NOT NULL, allow_multiple INTEGER NOT NULL DEFAULT 0, unit TEXT, use_for_display INTEGER NOT NULL DEFAULT 1, use_for_compatibility INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS attribute_options (id TEXT PRIMARY KEY, attribute_id TEXT NOT NULL, value TEXT NOT NULL, label TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, UNIQUE(attribute_id, value), FOREIGN KEY(attribute_id) REFERENCES attribute_definitions(id) ON DELETE CASCADE)"),
    db.prepare("CREATE TABLE IF NOT EXISTS category_attributes (category TEXT NOT NULL, attribute_id TEXT NOT NULL, required INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(category, attribute_id), FOREIGN KEY(attribute_id) REFERENCES attribute_definitions(id) ON DELETE CASCADE)"),
    db.prepare("CREATE TABLE IF NOT EXISTS compatibility_rules (id TEXT PRIMARY KEY, left_category TEXT NOT NULL, left_attribute_code TEXT NOT NULL, operator TEXT NOT NULL, right_category TEXT NOT NULL, right_attribute_code TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'error', message TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS image_objects (key TEXT PRIMARY KEY, filename TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, password_iterations INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, approved_at TEXT, approved_by TEXT, last_login_at TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"),
    db.prepare("CREATE TABLE IF NOT EXISTS login_attempts (username TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, window_started_at TEXT NOT NULL, locked_until TEXT)"),
    db.prepare("CREATE INDEX IF NOT EXISTS products_category_status_idx ON products(category, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at)"),
  ]);

  const now = new Date().toISOString();
  await db.batch(attributes.map(([id, code, label, valueType, multiple, unit, compatibility]) =>
    db.prepare("INSERT OR IGNORE INTO attribute_definitions (id, code, label, value_type, allow_multiple, unit, use_for_display, use_for_compatibility, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)").bind(id, code, label, valueType, multiple, unit, compatibility, now)
  ));
  await db.batch(options.map(([id, attributeId, value, label]) =>
    db.prepare("INSERT OR IGNORE INTO attribute_options (id, attribute_id, value, label, sort_order) VALUES (?, ?, ?, ?, 0)").bind(id, attributeId, value, label)
  ));
  const categoryStatements: D1PreparedStatement[] = [];
  for (const [category, fields] of Object.entries(categoryMap)) {
    for (const [index, [attributeId, required]] of fields.entries()) {
      categoryStatements.push(db.prepare("INSERT OR IGNORE INTO category_attributes (category, attribute_id, required, sort_order) VALUES (?, ?, ?, ?)").bind(category, attributeId, required ? 1 : 0, index));
    }
  }
  await db.batch(categoryStatements);

  const rules = [
    ["rule_cpu_mb_socket", "cpu", "socket", "equals", "motherboard", "socket", "CPU socket ไม่ตรงกับ Mainboard"],
    ["rule_cpu_mb_memory", "cpu", "memory_type", "overlaps", "motherboard", "memory_type", "CPU และ Mainboard ไม่รองรับ Memory ชนิดเดียวกัน"],
    ["rule_mb_ram", "motherboard", "memory_type", "overlaps", "memory", "memory_type", "Memory ไม่ตรงกับ Mainboard"],
    ["rule_gpu_psu", "gpu", "recommended_psu_w", "lte", "psu", "wattage", "PSU มีกำลังไฟต่ำกว่าที่ GPU แนะนำ"],
    ["rule_gpu_case", "gpu", "length_mm", "lte", "case", "max_gpu_length_mm", "GPU ยาวเกินพื้นที่ของ Case"],
    ["rule_mb_case", "motherboard", "form_factor", "contained_in", "case", "supported_mainboard_form_factors", "Mainboard form factor ไม่รองรับโดย Case"],
    ["rule_cpu_cooler", "cpu", "socket", "contained_in", "cooler", "supported_sockets", "Cooler ไม่รองรับ CPU socket"],
  ];
  await db.batch(rules.map(([id, leftCategory, leftCode, operator, rightCategory, rightCode, message]) =>
    db.prepare("INSERT OR IGNORE INTO compatibility_rules (id, left_category, left_attribute_code, operator, right_category, right_attribute_code, severity, message, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 'error', ?, 1, ?)").bind(id, leftCategory, leftCode, operator, rightCategory, rightCode, message, now)
  ));
  await seedProducts(db, now);
}

async function seedProducts(db: D1Database, now: string) {
  const statements: D1PreparedStatement[] = [];
  statements.push(db.prepare("INSERT OR IGNORE INTO products (id, slug, category, brand, model, title, short_description, description, price, affiliate_url, shop_name, images, attributes, performance_score, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)")
    .bind(
      "prod_intel_i5_14400f_next",
      "intel-core-i5-14400f-next-a0157341",
      "cpu",
      "Intel",
      "Core i5-14400F",
      "INTEL CPU CORE I5-14400F LGA 1700 (NEXT) - A0157341",
      "ซีพียูเดสก์ท็อป Intel Core เจนเนอเรชัน 14 แบบ 10 คอร์ 16 เธรด สูงสุด 4.7 GHz ไม่มีกราฟิกในตัว",
      "Intel Core i5-14400F สำหรับเดสก์ท็อป ใช้สถาปัตยกรรมแบบ Hybrid ประกอบด้วย 6 Performance-cores และ 4 Efficient-cores รวม 10 คอร์ 16 เธรด ความถี่ P-core พื้นฐาน 2.5 GHz และเร่งสูงสุด 4.7 GHz มี Intel Smart Cache 20 MB รองรับหน่วยความจำ DDR5-4800 หรือ DDR4-3200 สูงสุด 192 GB ใช้ซ็อกเก็ต LGA1700 กำลังไฟพื้นฐาน 65W และกำลังไฟเทอร์โบสูงสุด 148W รุ่น F ไม่มีกราฟิกในตัว จึงจำเป็นต้องใช้การ์ดจอแยก สินค้าแบบกล่อง NEXT ระบุว่ามีชุดระบายความร้อนมาให้",
      6730,
      "https://s.shopee.co.th/9AOcemGiaB",
      "Advice Official Shop",
      JSON.stringify([
        "/products/intel-core-i5-14400f-next/01.jpg",
        "/products/intel-core-i5-14400f-next/02.jpg",
        "/products/intel-core-i5-14400f-next/03.jpg",
        "/products/intel-core-i5-14400f-next/04.jpg"
      ]),
      JSON.stringify({
        socket: "lga1700", memory_type: ["ddr4", "ddr5"], cores: 10, threads: 16,
        p_cores: 6, e_cores: 4, base_clock_ghz: 2.5, boost_clock_ghz: 4.7,
        cache_mb: 20, tdp_w: 65, max_turbo_power_w: 148,
        integrated_graphics: false, cooler_included: true
      }),
      84,
      now,
      now
    ));
  const seeds = [
    ["prod_9800x3d", "amd-ryzen-7-9800x3d", "cpu", "AMD", "Ryzen 7 9800X3D", "AMD Ryzen 7 9800X3D", 18900, 96, { socket: "am5", memory_type: ["ddr5"], cores: 8, threads: 16, tdp_w: 120 }],
    ["prod_b650", "asus-prime-b650-plus-wifi", "motherboard", "ASUS", "Prime B650-Plus WiFi", "ASUS Prime B650-Plus WiFi", 7490, 87, { socket: "am5", memory_type: ["ddr5"], chipset: "B650", form_factor: "atx" }],
    ["prod_5070", "geforce-rtx-5070-12gb", "gpu", "NVIDIA", "GeForce RTX 5070 12GB", "NVIDIA GeForce RTX 5070 12GB", 24900, 91, { vram_gb: 12, length_mm: 304, recommended_psu_w: 650, tdp_w: 250 }],
    ["prod_ddr5", "kingston-fury-beast-32gb-6000", "memory", "Kingston", "Fury Beast 32GB DDR5-6000", "Kingston Fury Beast 32GB DDR5-6000", 3990, 88, { memory_type: ["ddr5"], capacity_gb: 32 }],
    ["prod_psu", "corsair-rm750e", "psu", "Corsair", "RM750e 750W Gold", "Corsair RM750e 750W Gold", 3990, 90, { wattage: 750 }],
  ] as const;
  for (const [id, slug, category, brand, model, title, price, score, attrs] of seeds) {
    statements.push(db.prepare("INSERT OR IGNORE INTO products (id, slug, category, brand, model, title, short_description, description, price, affiliate_url, shop_name, images, attributes, performance_score, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '[]', ?, ?, 'published', ?, ?)").bind(id, slug, category, brand, model, title, `${model} — mock product for API integration.`, "ข้อมูลตัวอย่างสำหรับทดสอบ API และ Compatibility Engine", price, JSON.stringify(attrs), score, now, now));
  }
  await db.batch(statements);
}
