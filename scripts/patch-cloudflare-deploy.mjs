import { readFile, writeFile } from "node:fs/promises";

const configPath = new URL("../dist/server/wrangler.json", import.meta.url);

const d1DatabaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const d1DatabaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME || "pcbuild-cms-db";
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "pcbuild-product-images";

try {
  const config = JSON.parse(await readFile(configPath, "utf8"));

  config.name = process.env.CLOUDFLARE_WORKER_NAME || config.name || "pcbuild-cms-26";
  config.d1_databases = [{
    binding: "DB",
    database_name: d1DatabaseName,
    database_id: d1DatabaseId || "00000000-0000-4000-8000-000000000000"
  }];
  config.r2_buckets = [{
    binding: "PRODUCT_IMAGES",
    bucket_name: r2BucketName
  }];

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

  if (!d1DatabaseId) {
    console.warn(
      "CLOUDFLARE_D1_DATABASE_ID is not set. Set it in Cloudflare before deploying."
    );
  }
} catch (error) {
  console.warn(
    `Unable to patch dist/server/wrangler.json: ${error instanceof Error ? error.message : String(error)}`
  );
}
