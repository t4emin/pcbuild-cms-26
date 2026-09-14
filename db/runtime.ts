import { env } from "cloudflare:workers";

let initialization: Promise<void> | null = null;

const attributes = [
  ["attr_socket", "socket", "Socket", "select", 0, null, 1],
  ["attr_memory_type", "memory_type", "Memory support", "select", 1, null, 1],
  ["attr_cores", "cores", "Cores", "number", 0, null, 0],
  ["attr_threads", "threads", "Threads", "number", 0, null, 0],
  ["attr_tdp_w", "tdp_w", "TDP", "number", 0, "W", 0],
  ["attr_chipset", "chipset", "Chipset", "text", 0, null, 0],
  ["attr_form_factor", "form_factor", "Form factor", "select", 0, null, 1],
  ["attr_supported_mb", "supported_mainboard_form_factors", "Mainboard support", "select", 1, null, 1],
  ["attr_vram_gb", "vram_gb", "VRAM", "number", 0, "GB", 0],
  ["attr_gpu_length", "length_mm", "GPU length", "number", 0, "mm", 1],
  ["attr_max_gpu", "max_gpu_length_mm", "Max GPU length", "number", 0, "mm", 1],
  ["attr_psu_recommended", "recommended_psu_w", "Recommended PSU", "number", 0, "W", 1],
  ["attr_wattage", "wattage", "Wattage", "number", 0, "W", 1],
  ["attr_capacity", "capacity_gb", "Capacity", "number", 0, "GB", 0],
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
  ["opt_cooler_am5", "attr_cooler_sockets", "am5", "AM5"],
  ["opt_cooler_lga1700", "attr_cooler_sockets", "lga1700", "LGA1700"],
  ["opt_cooler_lga1851", "attr_cooler_sockets", "lga1851", "LGA1851"],
] as const;

const categoryMap: Record<string, Array<[string, boolean]>> = {
  cpu: [["attr_socket", true], ["attr_memory_type", true], ["attr_cores", false], ["attr_threads", false], ["attr_tdp_w", false]],
  motherboard: [["attr_socket", true], ["attr_memory_type", true], ["attr_chipset", false], ["attr_form_factor", true]],
  gpu: [["attr_vram_gb", false], ["attr_gpu_length", false], ["attr_psu_recommended", true], ["attr_tdp_w", false]],
  memory: [["attr_memory_type", true], ["attr_capacity", false]],
  storage: [["attr_capacity", false], ["attr_interface", true]],
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
    db.prepare("CREATE INDEX IF NOT EXISTS products_category_status_idx ON products(category, status)"),
  ]);

  const now = new Date().toISOString();
  for (const [id, code, label, valueType, multiple, unit, compatibility] of attributes) {
    await db.prepare("INSERT OR IGNORE INTO attribute_definitions (id, code, label, value_type, allow_multiple, unit, use_for_display, use_for_compatibility, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)").bind(id, code, label, valueType, multiple, unit, compatibility, now).run();
  }
  for (const [id, attributeId, value, label] of options) {
    await db.prepare("INSERT OR IGNORE INTO attribute_options (id, attribute_id, value, label, sort_order) VALUES (?, ?, ?, ?, 0)").bind(id, attributeId, value, label).run();
  }
  for (const [category, fields] of Object.entries(categoryMap)) {
    for (const [index, [attributeId, required]] of fields.entries()) {
      await db.prepare("INSERT OR IGNORE INTO category_attributes (category, attribute_id, required, sort_order) VALUES (?, ?, ?, ?)").bind(category, attributeId, required ? 1 : 0, index).run();
    }
  }

  const rules = [
    ["rule_cpu_mb_socket", "cpu", "socket", "equals", "motherboard", "socket", "CPU socket ไม่ตรงกับ Mainboard"],
    ["rule_cpu_mb_memory", "cpu", "memory_type", "overlaps", "motherboard", "memory_type", "CPU และ Mainboard ไม่รองรับ Memory ชนิดเดียวกัน"],
    ["rule_mb_ram", "motherboard", "memory_type", "overlaps", "memory", "memory_type", "Memory ไม่ตรงกับ Mainboard"],
    ["rule_gpu_psu", "gpu", "recommended_psu_w", "lte", "psu", "wattage", "PSU มีกำลังไฟต่ำกว่าที่ GPU แนะนำ"],
    ["rule_gpu_case", "gpu", "length_mm", "lte", "case", "max_gpu_length_mm", "GPU ยาวเกินพื้นที่ของ Case"],
    ["rule_mb_case", "motherboard", "form_factor", "contained_in", "case", "supported_mainboard_form_factors", "Mainboard form factor ไม่รองรับโดย Case"],
    ["rule_cpu_cooler", "cpu", "socket", "contained_in", "cooler", "supported_sockets", "Cooler ไม่รองรับ CPU socket"],
  ];
  for (const [id, leftCategory, leftCode, operator, rightCategory, rightCode, message] of rules) {
    await db.prepare("INSERT OR IGNORE INTO compatibility_rules (id, left_category, left_attribute_code, operator, right_category, right_attribute_code, severity, message, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 'error', ?, 1, ?)").bind(id, leftCategory, leftCode, operator, rightCategory, rightCode, message, now).run();
  }
  await seedProducts(db, now);
}

async function seedProducts(db: D1Database, now: string) {
  const seeds = [
    ["prod_9800x3d", "amd-ryzen-7-9800x3d", "cpu", "AMD", "Ryzen 7 9800X3D", "AMD Ryzen 7 9800X3D", 18900, 96, { socket: "am5", memory_type: ["ddr5"], cores: 8, threads: 16, tdp_w: 120 }],
    ["prod_b650", "asus-prime-b650-plus-wifi", "motherboard", "ASUS", "Prime B650-Plus WiFi", "ASUS Prime B650-Plus WiFi", 7490, 87, { socket: "am5", memory_type: ["ddr5"], chipset: "B650", form_factor: "atx" }],
    ["prod_5070", "geforce-rtx-5070-12gb", "gpu", "NVIDIA", "GeForce RTX 5070 12GB", "NVIDIA GeForce RTX 5070 12GB", 24900, 91, { vram_gb: 12, length_mm: 304, recommended_psu_w: 650, tdp_w: 250 }],
    ["prod_ddr5", "kingston-fury-beast-32gb-6000", "memory", "Kingston", "Fury Beast 32GB DDR5-6000", "Kingston Fury Beast 32GB DDR5-6000", 3990, 88, { memory_type: ["ddr5"], capacity_gb: 32 }],
    ["prod_psu", "corsair-rm750e", "psu", "Corsair", "RM750e 750W Gold", "Corsair RM750e 750W Gold", 3990, 90, { wattage: 750 }],
  ] as const;
  for (const [id, slug, category, brand, model, title, price, score, attrs] of seeds) {
    await db.prepare("INSERT OR IGNORE INTO products (id, slug, category, brand, model, title, short_description, description, price, affiliate_url, shop_name, images, attributes, performance_score, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '[]', ?, ?, 'published', ?, ?)").bind(id, slug, category, brand, model, title, `${model} — mock product for API integration.`, "ข้อมูลตัวอย่างสำหรับทดสอบ API และ Compatibility Engine", price, JSON.stringify(attrs), score, now, now).run();
  }
}
