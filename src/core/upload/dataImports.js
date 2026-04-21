import { supabase } from "../api/supabaseClient";
import { applySiteFilter, readActiveSiteId } from "../auth/siteScope";
import {
  fetchProductCatalog,
  joinBarcodeValues,
  normalizeCatalogCode,
  splitBarcodeValues,
} from "../api/productCatalogApi";
import { parseTabularFile } from "../../utils/tabularFile";
import { resolveMappedValue } from "../utils/importExportMapping";
import { IMPORT_EXPORT_ENTITIES } from "../config/importExportDefaults";

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, "");
}

function normalizeLookupValue(value) {
  return normalizeCatalogCode(value);
}

async function fetchAllRows(table, columns, pageSize = 1000, siteId = readActiveSiteId()) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await applySiteFilter(
      supabase.from(table).select(columns),
      siteId
    ).range(from, to);

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

function normalizeOptionalDate(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) {
    return "__invalid_date__";
  }

  return parsedDate.toISOString().slice(0, 10);
}

function ensureRequiredImportColumns(headers, mappingConfig, entityKey) {
  const entity = IMPORT_EXPORT_ENTITIES[entityKey];
  if (!entity) return;

  const missingFields = entity.importFields
    .filter((field) => field.required)
    .filter((field) => {
      const fieldConfig = mappingConfig?.fields?.[field.key];
      if (fieldConfig?.mode === "index") {
        return false;
      }

      const mappedHeader = normalizeHeader(fieldConfig?.value);
      if (mappedHeader) {
        return !headers.includes(mappedHeader);
      }

      return !(field.aliases || []).some((alias) => headers.includes(normalizeHeader(alias)));
    })
    .map((field) => field.label);

  if (missingFields.length > 0) {
    throw new Error(`Brak wymaganych kolumn: ${missingFields.join(", ")}`);
  }
}

export async function buildStockImportPreview(file, mappingConfig) {
  const activeSiteId = readActiveSiteId();
  const { headers, data, rawRows = [] } = await parseTabularFile(file);
  ensureRequiredImportColumns(headers, mappingConfig, "stock");

  const parsed = data.map((row, index) => ({
    location_code: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.location_code,
      fallbackAliases: ["location_code", "location", "lokalizacja"],
    }),
    sku: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.sku,
      fallbackAliases: ["sku"],
    }),
    ean: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.ean,
      fallbackAliases: ["ean", "barcode", "kod", "kod_kreskowy"],
    }),
    lot: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.lot,
      fallbackAliases: ["lot", "batch", "partia"],
    }),
    expiry_date: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.expiry_date,
      fallbackAliases: ["expiry_date", "expiry", "data_waznosci", "best_before"],
    }),
    quantity: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.quantity,
      fallbackAliases: ["quantity", "ilosc", "qty"],
    }),
    zone: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.zone,
      fallbackAliases: ["zone", "strefa"],
    }),
  }));

  const [locations, catalog] = await Promise.all([
    fetchAllRows("locations", "id, code", 1000, activeSiteId),
    fetchProductCatalog(activeSiteId),
  ]);

  const locationMap = Object.fromEntries(
    locations.map((row) => [normalizeLookupValue(row.code), row.id])
  );
  const valid = [];
  const invalid = [];

  parsed.forEach((row) => {
    const errors = [];
    const normalizedLocationCode = normalizeLookupValue(row.location_code);
    const normalizedSku = normalizeLookupValue(row.sku);
    const normalizedBarcode = normalizeLookupValue(row.ean);
    const locationId = locationMap[normalizedLocationCode];
    const skuMatch = normalizedSku ? catalog.productBySku.get(normalizedSku) : null;
    const barcodeMatch = normalizedBarcode ? catalog.productByBarcode.get(normalizedBarcode) : null;
    const product = skuMatch || barcodeMatch?.product || null;
    const quantity = Number(row.quantity);
    const expiryDate = normalizeOptionalDate(row.expiry_date);

    if (!row.location_code) errors.push("Brak lokalizacji");
    else if (!locationId) errors.push("Nieznana lokalizacja");

    if (!row.sku && !row.ean) errors.push("Brak SKU lub EAN");
    else if (!product) errors.push("Nieznany SKU / EAN");

    if (row.quantity === "") errors.push("Brak ilosci");
    else if (Number.isNaN(quantity)) errors.push("Niepoprawna ilosc");

    if (expiryDate === "__invalid_date__") {
      errors.push("Niepoprawna data waznosci");
    }

    if (errors.length > 0) {
      invalid.push({ ...row, errors });
      return;
    }

    valid.push({
      location_id: locationId,
      product_id: product.id,
      quantity,
      barcode_value: row.ean || barcodeMatch?.barcode?.code_value || null,
      lot: row.lot || null,
      expiry_date: expiryDate,
    });
  });

  return { headers, parsed, valid, invalid };
}

export async function buildPricesImportPreview(file, mappingConfig) {
  const activeSiteId = readActiveSiteId();
  const { headers, data, rawRows = [] } = await parseTabularFile(file);
  ensureRequiredImportColumns(headers, mappingConfig, "prices");

  const catalog = await fetchProductCatalog(activeSiteId);
  const parsed = data.map((row, index) => ({
    sku: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.sku,
      fallbackAliases: ["sku"],
    }),
    price: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.price,
      fallbackAliases: ["price", "cena"],
    }),
  }));
  const valid = [];
  const invalid = [];

  parsed.forEach((row) => {
    const errors = [];
    const price = Number(row.price);
    const product = catalog.productBySku.get(normalizeLookupValue(row.sku));

    if (!row.sku) errors.push("Brak SKU");
    else if (!product?.id) errors.push("Nieznany SKU");

    if (row.price === "") errors.push("Brak ceny");
    else if (Number.isNaN(price)) errors.push("Cena nie jest liczba");

    if (errors.length > 0) {
      invalid.push({ ...row, errors });
      return;
    }

    valid.push({ sku: row.sku, product_id: product.id, price });
  });

  return { headers, parsed, valid, invalid };
}

export async function buildLocationsImportPreview(file, mappingConfig) {
  const { headers, data, rawRows = [] } = await parseTabularFile(file);
  ensureRequiredImportColumns(headers, mappingConfig, "locations");

  const parsed = data.map((row, index) => ({
    code: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.code,
      fallbackAliases: ["code", "location", "lokalizacja"],
    }),
    zone: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.zone,
      fallbackAliases: ["zone", "strefa"],
    }),
    aisle: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.aisle,
      fallbackAliases: ["aisle", "aleja", "korytarz"],
    }),
    level: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.level,
      fallbackAliases: ["level", "poziom", "poziom_lokacji"],
    }),
    location_type: resolveMappedValue({
      row,
      rawRow: rawRows[index],
      fieldConfig: mappingConfig?.fields?.location_type,
      fallbackAliases: ["location_type", "typ_lokalizacji", "type", "typ"],
    }),
    status:
      resolveMappedValue({
        row,
        rawRow: rawRows[index],
        fieldConfig: mappingConfig?.fields?.status,
        fallbackAliases: ["status"],
      }) || "active",
  }));
  const valid = [];
  const invalid = [];
  const seen = new Set();

  parsed.forEach((row) => {
    const errors = [];
    const normalizedCode = String(row.code || "").trim();

    if (!normalizedCode) {
      errors.push("Brak lokalizacji");
    }

    if (!row.zone) {
      errors.push("Brak strefy");
    }

    if (!row.aisle) {
      errors.push("Brak alei");
    }

    if (!row.level) {
      errors.push("Brak poziomu");
    }

    if (!row.location_type) {
      errors.push("Brak typu lokalizacji");
    }

    if (normalizedCode) {
      const duplicateKey = normalizedCode.toUpperCase();
      if (seen.has(duplicateKey)) {
        errors.push("Duplikat lokalizacji w pliku");
      } else {
        seen.add(duplicateKey);
      }
    }

    if (errors.length > 0) {
      invalid.push({ ...row, errors });
      return;
    }

    valid.push({
      code: normalizedCode,
      zone: String(row.zone || "").trim(),
      aisle: String(row.aisle || "").trim(),
      level: String(row.level || "").trim(),
      location_type: String(row.location_type || "").trim(),
      status: String(row.status || "active").trim() || "active",
    });
  });

  return {
    headers,
    parsed,
    valid,
    invalid,
  };
}

export async function buildProductsImportPreview(file, mappingConfig) {
  const { headers, data, rawRows = [] } = await parseTabularFile(file);
  ensureRequiredImportColumns(headers, mappingConfig, "products");

  const parsed = data.map((row, index) => {
    const barcodeValues = splitBarcodeValues(
      resolveMappedValue({
        row,
        rawRow: rawRows[index],
        fieldConfig: mappingConfig?.fields?.ean,
        fallbackAliases: ["ean", "barcodes", "ean_list", "kody", "ean_codes"],
      }) || null
    );

    return {
      sku: resolveMappedValue({
        row,
        rawRow: rawRows[index],
        fieldConfig: mappingConfig?.fields?.sku,
        fallbackAliases: ["sku"],
      }),
      ean: joinBarcodeValues(barcodeValues) || null,
      barcode_values: barcodeValues,
      name:
        resolveMappedValue({
          row,
          rawRow: rawRows[index],
          fieldConfig: mappingConfig?.fields?.name,
          fallbackAliases: ["name", "nazwa"],
        }) || null,
      status:
        resolveMappedValue({
          row,
          rawRow: rawRows[index],
          fieldConfig: mappingConfig?.fields?.status,
          fallbackAliases: ["status"],
        }) || "active",
    };
  });

  const valid = [];
  const invalid = [];
  const seen = new Set();

  parsed.forEach((row) => {
    const errors = [];

    if (!row.sku) {
      errors.push("Brak SKU");
    } else if (seen.has(normalizeLookupValue(row.sku))) {
      errors.push("Duplikat SKU w pliku");
    } else {
      seen.add(normalizeLookupValue(row.sku));
    }

    if (errors.length > 0) {
      invalid.push({ ...row, errors });
      return;
    }

    valid.push(row);
  });

  return { headers, parsed, valid, invalid };
}
