export const MANUAL_STEP_DEFINITIONS = [
  { key: "location", label: "Lokalizacja", lockRequired: true },
  { key: "ean", label: "EAN" },
  { key: "sku", label: "SKU" },
  { key: "lot", label: "LOT" },
  { key: "expiry", label: "Data waznosci" },
  { key: "type", label: "Typ operacji" },
  { key: "quantity", label: "Ilosc" },
  { key: "confirmation", label: "Potwierdzenie" },
];

export const DEFAULT_MANUAL_PROCESS_CONFIG = {
  steps: {
    location: { label: "Lokalizacja", enabled: true, mandatory: true, order: 1, lockRequired: true },
    ean: { label: "EAN", enabled: true, mandatory: false, order: 2 },
    sku: { label: "SKU", enabled: true, mandatory: true, order: 3 },
    lot: { label: "LOT", enabled: true, mandatory: false, order: 4 },
    expiry: { label: "Data waznosci", enabled: true, mandatory: false, order: 5 },
    type: { label: "Typ operacji", enabled: true, mandatory: true, order: 6 },
    quantity: { label: "Ilosc", enabled: true, mandatory: true, order: 7 },
    confirmation: { label: "Potwierdzenie", enabled: true, mandatory: false, order: 8 },
  },
  operationTypes: {
    shortage: { label: "Brak", value: "brak", enabled: true },
    surplus: { label: "Nadwyzka", value: "surplus", enabled: true },
  },
  validation: {
    lotPattern: "^[A-Za-z0-9._/-]{1,50}$",
    lotMessage: "Niepoprawny format LOT",
    eanPattern: "",
    eanMessage: "Niepoprawny format EAN",
    skuPattern: "",
    skuMessage: "Niepoprawny format SKU",
    quantityWarningThreshold: 999,
    quantityHardLimit: 999999,
    quantityHardLimitMessage: "Ilosc przekracza dopuszczalny limit",
    locationTimeoutMs: 5 * 60 * 1000,
    saveTimeoutMs: 10000,
    saveRetries: 2,
    fetchRetries: 2,
  },
};

function clampOrder(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }
  return Math.round(number);
}

function normalizeBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "1" || value === 1) {
    return true;
  }

  if (value === "false" || value === "0" || value === 0) {
    return false;
  }

  return fallback;
}

export function normalizeManualProcessConfig(rawConfig = {}) {
  const sourceSteps = rawConfig.steps || rawConfig.manualSteps || {};
  const sourceValidation = rawConfig.validation || rawConfig.validation_rules || rawConfig;
  const sourceOperationTypes = rawConfig.operationTypes || rawConfig.operation_types || {};

  const steps = MANUAL_STEP_DEFINITIONS.reduce((acc, definition, index) => {
    const rawStep = sourceSteps[definition.key] || {};
    const fallback = DEFAULT_MANUAL_PROCESS_CONFIG.steps[definition.key];

    acc[definition.key] = {
      label: rawStep.label || fallback.label,
      enabled:
        definition.key === "location"
          ? true
          : normalizeBoolean(rawStep.enabled, fallback.enabled),
      mandatory:
        definition.key === "location"
          ? true
          : normalizeBoolean(rawStep.mandatory, fallback.mandatory),
      order: clampOrder(rawStep.order, fallback.order || index + 1),
      lockRequired:
        definition.key === "location"
          ? true
          : normalizeBoolean(rawStep.lockRequired, fallback.lockRequired || false),
    };

    return acc;
  }, {});

  const operationTypes = {
    shortage: {
      ...DEFAULT_MANUAL_PROCESS_CONFIG.operationTypes.shortage,
      ...(sourceOperationTypes.shortage || {}),
      enabled: normalizeBoolean(
        sourceOperationTypes?.shortage?.enabled,
        DEFAULT_MANUAL_PROCESS_CONFIG.operationTypes.shortage.enabled,
      ),
    },
    surplus: {
      ...DEFAULT_MANUAL_PROCESS_CONFIG.operationTypes.surplus,
      ...(sourceOperationTypes.surplus || {}),
      enabled: normalizeBoolean(
        sourceOperationTypes?.surplus?.enabled,
        DEFAULT_MANUAL_PROCESS_CONFIG.operationTypes.surplus.enabled,
      ),
    },
  };

  const validation = {
    ...DEFAULT_MANUAL_PROCESS_CONFIG.validation,
    lotPattern: sourceValidation.lotPattern || sourceValidation.lot_pattern || DEFAULT_MANUAL_PROCESS_CONFIG.validation.lotPattern,
    lotMessage: sourceValidation.lotMessage || sourceValidation.lot_message || DEFAULT_MANUAL_PROCESS_CONFIG.validation.lotMessage,
    eanPattern: sourceValidation.eanPattern || sourceValidation.ean_pattern || DEFAULT_MANUAL_PROCESS_CONFIG.validation.eanPattern,
    eanMessage: sourceValidation.eanMessage || sourceValidation.ean_message || DEFAULT_MANUAL_PROCESS_CONFIG.validation.eanMessage,
    skuPattern: sourceValidation.skuPattern || sourceValidation.sku_pattern || DEFAULT_MANUAL_PROCESS_CONFIG.validation.skuPattern,
    skuMessage: sourceValidation.skuMessage || sourceValidation.sku_message || DEFAULT_MANUAL_PROCESS_CONFIG.validation.skuMessage,
    quantityWarningThreshold:
      Number(sourceValidation.quantityWarningThreshold || sourceValidation.maxQuantityWarning) ||
      DEFAULT_MANUAL_PROCESS_CONFIG.validation.quantityWarningThreshold,
    quantityHardLimit:
      Number(sourceValidation.quantityHardLimit || sourceValidation.quantityLimit) ||
      DEFAULT_MANUAL_PROCESS_CONFIG.validation.quantityHardLimit,
    quantityHardLimitMessage:
      sourceValidation.quantityHardLimitMessage ||
      sourceValidation.quantity_limit_message ||
      DEFAULT_MANUAL_PROCESS_CONFIG.validation.quantityHardLimitMessage,
    locationTimeoutMs:
      Number(sourceValidation.locationTimeoutMs || sourceValidation.locationTimeoutSeconds) > 0
        ? Number(sourceValidation.locationTimeoutMs || sourceValidation.locationTimeoutSeconds) *
          (String(sourceValidation.locationTimeoutMs || "").includes("000") ? 1 : 1000)
        : DEFAULT_MANUAL_PROCESS_CONFIG.validation.locationTimeoutMs,
    saveTimeoutMs:
      Number(sourceValidation.saveTimeoutMs || sourceValidation.apiTimeoutMs) ||
      DEFAULT_MANUAL_PROCESS_CONFIG.validation.saveTimeoutMs,
    saveRetries:
      Number(sourceValidation.saveRetries) || DEFAULT_MANUAL_PROCESS_CONFIG.validation.saveRetries,
    fetchRetries:
      Number(sourceValidation.fetchRetries) || DEFAULT_MANUAL_PROCESS_CONFIG.validation.fetchRetries,
  };

  return {
    steps,
    operationTypes,
    validation,
  };
}

export function serializeManualProcessConfig(config) {
  const normalized = normalizeManualProcessConfig(config);

  return {
    steps: normalized.steps,
    operationTypes: normalized.operationTypes,
    validation: normalized.validation,
  };
}

export function getOrderedEnabledManualSteps(config) {
  return Object.entries(config.steps || {})
    .filter(([, value]) => value.enabled)
    .sort((a, b) => Number(a[1].order || 0) - Number(b[1].order || 0))
    .map(([key, value]) => ({ key, ...value }));
}
