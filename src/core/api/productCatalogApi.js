import { supabase } from "./supabaseClient";
import { applySiteFilter, ensureRowsScoped, readActiveSiteId } from "../auth/siteScope";

export function normalizeCatalogCode(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

export function splitBarcodeValues(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return [];
  }

  const rawCodes = normalized
    .split(/[\n,;|]+/g)
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const seen = new Set();
  return rawCodes.filter((item) => {
    const key = normalizeCatalogCode(item);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function joinBarcodeValues(values) {
  return (values || [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");
}

export async function fetchAllSiteRows(table, columns, { siteId = readActiveSiteId(), pageSize = 1000 } = {}) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await applySiteFilter(
      supabase.from(table).select(columns),
      siteId
    ).range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const chunk = data || [];
    rows.push(...chunk);

    if (chunk.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

function buildLegacyBarcodeRows(products = []) {
  return products
    .filter((product) => String(product.ean || "").trim())
    .map((product) => ({
      id: `legacy-${product.id}`,
      product_id: product.id,
      code_type: "ean",
      code_value: String(product.ean || "").trim(),
      is_primary: true,
      site_id: product.site_id || null,
      is_legacy: true,
    }));
}

export async function fetchProductCatalog(siteId = readActiveSiteId()) {
  const [products, barcodeRows] = await Promise.all([
    fetchAllSiteRows("products", "id, sku, ean, name, status, site_id", { siteId }),
    fetchAllSiteRows("product_barcodes", "id, product_id, code_type, code_value, is_primary, site_id", { siteId }).catch(
      () => []
    ),
  ]);

  const combinedBarcodeRows = [...barcodeRows];
  const existingBarcodeKeys = new Set(
    combinedBarcodeRows.map((row) => `${row.product_id}::${normalizeCatalogCode(row.code_value)}`)
  );

  buildLegacyBarcodeRows(products).forEach((row) => {
    const key = `${row.product_id}::${normalizeCatalogCode(row.code_value)}`;
    if (!existingBarcodeKeys.has(key)) {
      combinedBarcodeRows.push(row);
    }
  });

  const productsById = new Map();
  const productBySku = new Map();
  const productByBarcode = new Map();
  const barcodesByProductId = new Map();
  const primaryBarcodeByProductId = new Map();

  (products || []).forEach((product) => {
    productsById.set(product.id, product);
    if (product.sku) {
      productBySku.set(normalizeCatalogCode(product.sku), product);
    }
  });

  combinedBarcodeRows.forEach((barcode) => {
    const product = productsById.get(barcode.product_id);
    if (!product) {
      return;
    }

    const normalizedCode = normalizeCatalogCode(barcode.code_value);
    if (!normalizedCode) {
      return;
    }

    productByBarcode.set(normalizedCode, {
      product,
      barcode,
    });

    const bucket = barcodesByProductId.get(product.id) || [];
    bucket.push(barcode);
    barcodesByProductId.set(product.id, bucket);

    if (barcode.is_primary && !primaryBarcodeByProductId.has(product.id)) {
      primaryBarcodeByProductId.set(product.id, barcode);
    }
  });

  productsById.forEach((product, productId) => {
    if (!primaryBarcodeByProductId.has(productId)) {
      const firstBarcode = (barcodesByProductId.get(productId) || [])[0] || null;
      if (firstBarcode) {
        primaryBarcodeByProductId.set(productId, firstBarcode);
      }
    }
  });

  return {
    products,
    barcodes: combinedBarcodeRows,
    productsById,
    productBySku,
    productByBarcode,
    barcodesByProductId,
    primaryBarcodeByProductId,
  };
}

export function getProductBarcodeValues(catalog, productId) {
  return (catalog?.barcodesByProductId.get(productId) || []).map((row) => String(row.code_value || "").trim()).filter(Boolean);
}

export function getPrimaryProductBarcode(catalog, productId) {
  return catalog?.primaryBarcodeByProductId.get(productId)?.code_value || null;
}

export async function resolveProductBySkuOrBarcode({
  sku,
  barcode,
  siteId = readActiveSiteId(),
}) {
  const normalizedSku = normalizeCatalogCode(sku);
  const normalizedBarcode = normalizeCatalogCode(barcode);
  const catalog = await fetchProductCatalog(siteId);

  if (normalizedSku && catalog.productBySku.has(normalizedSku)) {
    const product = catalog.productBySku.get(normalizedSku);
    return {
      product,
      matchedBarcode: normalizedBarcode ? catalog.productByBarcode.get(normalizedBarcode)?.barcode || null : null,
      catalog,
    };
  }

  if (normalizedBarcode && catalog.productByBarcode.has(normalizedBarcode)) {
    const match = catalog.productByBarcode.get(normalizedBarcode);
    return {
      product: match.product,
      matchedBarcode: match.barcode,
      catalog,
    };
  }

  return {
    product: null,
    matchedBarcode: null,
    catalog,
  };
}

export async function syncProductBarcodes({
  productId,
  barcodeValues,
  siteId = readActiveSiteId(),
  keepExisting = true,
}) {
  const parsedCodes = splitBarcodeValues(barcodeValues);
  if (!parsedCodes.length) {
    return { inserted: 0 };
  }

  const existingRows = keepExisting
    ? await fetchAllSiteRows("product_barcodes", "id, product_id, code_value, is_primary, site_id", { siteId }).catch(() => [])
    : [];

  const existingForProduct = existingRows.filter((row) => row.product_id === productId);
  const existingKeys = new Set(existingForProduct.map((row) => normalizeCatalogCode(row.code_value)));
  const hasPrimary = existingForProduct.some((row) => row.is_primary);

  const rowsToInsert = parsedCodes
    .filter((code) => !existingKeys.has(normalizeCatalogCode(code)))
    .map((code, index) => ({
      product_id: productId,
      code_type: "ean",
      code_value: code,
      is_primary: !hasPrimary && index === 0,
    }));

  if (!rowsToInsert.length) {
    return { inserted: 0 };
  }

  const { error } = await supabase
    .from("product_barcodes")
    .upsert(ensureRowsScoped(rowsToInsert, siteId), {
      onConflict: "site_id,code_value",
      ignoreDuplicates: true,
    });

  if (error) {
    throw new Error(error.message || "Nie udalo sie zapisac kodow produktu");
  }

  return { inserted: rowsToInsert.length };
}

export async function upsertImportedProducts(rows, siteId = readActiveSiteId()) {
  const catalog = await fetchProductCatalog(siteId);
  const existingBySku = catalog.productBySku;
  const sourceBySku = new Map(
    (rows || []).map((row) => [normalizeCatalogCode(row.sku), row])
  );
  const inserts = [];
  const updates = [];
  const barcodeJobs = [];
  let skipped = 0;

  for (const row of rows || []) {
    const normalizedSku = normalizeCatalogCode(row.sku);
    if (!normalizedSku) {
      skipped += 1;
      continue;
    }

    const barcodeValues = splitBarcodeValues(row.barcode_values || row.ean || "");
    const primaryBarcode = barcodeValues[0] || null;
    const existing = existingBySku.get(normalizedSku);

    if (existing) {
      updates.push({
        id: existing.id,
        name: row.name || existing.name || null,
        status: row.status || existing.status || "active",
        ean: existing.ean || primaryBarcode || null,
      });
      barcodeJobs.push({
        productId: existing.id,
        barcodeValues,
      });
      continue;
    }

    inserts.push({
      sku: row.sku,
      ean: primaryBarcode,
      name: row.name || null,
      status: row.status || "active",
    });
  }

  let inserted = 0;
  let updated = 0;

  if (inserts.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .insert(ensureRowsScoped(inserts, siteId))
      .select("id, sku");

    if (error) {
      throw new Error(error.message || "Nie udalo sie zapisac nowych produktow");
    }

    inserted = data?.length || 0;

    for (const product of data || []) {
      const sourceRow = sourceBySku.get(normalizeCatalogCode(product.sku));
      if (!sourceRow) {
        continue;
      }

      barcodeJobs.push({
        productId: product.id,
        barcodeValues: sourceRow.barcode_values || splitBarcodeValues(sourceRow.ean || ""),
      });
    }
  }

  for (const row of updates) {
    const { error } = await applySiteFilter(
      supabase.from("products").update({
        name: row.name,
        status: row.status,
        ean: row.ean,
      }).eq("id", row.id),
      siteId
    );

    if (error) {
      throw new Error(error.message || "Nie udalo sie zaktualizowac produktu");
    }

    updated += 1;
  }

  for (const job of barcodeJobs) {
    await syncProductBarcodes({
      productId: job.productId,
      barcodeValues: job.barcodeValues,
      siteId,
      keepExisting: true,
    });
  }

  return {
    inserted,
    updated,
    skipped,
  };
}
