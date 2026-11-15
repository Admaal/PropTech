import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const quotaTf = await readFile(new URL("./gemini-quota.tf", import.meta.url), "utf8");
const variablesTf = await readFile(new URL("./variables.tf", import.meta.url), "utf8");

assert.match(
  quotaTf,
  /resource\s+"google_project_service"\s+"cloud_quotas"/,
  "la API Cloud Quotas debe declararse en Terraform",
);
assert.match(quotaTf, /service\s*=\s*"cloudquotas\.googleapis\.com"/);

assert.match(
  quotaTf,
  /resource\s+"google_cloud_quotas_quota_preference"/,
  "el tope debe ser una preferencia de cuota de Cloud Quotas",
);
assert.match(quotaTf, /service\s*=\s*"generativelanguage\.googleapis\.com"/);

// Pares explícitos (quota_id, modelo). El 6.º par queda fuera a propósito.
const expectedPairs = [
  ["GenerateRequestsPerDayPerProjectPerModel-FreeTier", "gemini-3.1-flash-lite"],
  ["GenerateRequestsPerDayPerProjectPerModel-FreeTier", "gemini-3-flash-preview"],
  ["GenerateRequestsPerDayPerProjectPerModel-PaidTier2", "gemini-3.1-flash-lite"],
  ["GenerateRequestsPerDayPerProjectPerModel-PaidTier2", "gemini-3-flash-preview"],
  ["GenerateRequestsPerDayPerProjectPerModel-PaidTier2", "gemini-2.5-flash-lite"],
];

for (const [quotaId, model] of expectedPairs) {
  assert.match(
    quotaTf,
    new RegExp(
      `quota_id\\s*=\\s*"${quotaId}"\\s*,\\s*model\\s*=\\s*"${model.replace(/\./g, "\\.")}"`,
    ),
    `falta el par ${quotaId} / ${model}`,
  );
}

// Free tier de gemini-2.5-flash-lite no se incluye: su límite por defecto ya es 20 y 150 sería un aumento.
assert.doesNotMatch(
  quotaTf,
  /quota_id\s*=\s*"GenerateRequestsPerDayPerProjectPerModel-FreeTier"\s*,\s*model\s*=\s*"gemini-2\.5-flash-lite"/,
  "free tier de gemini-2.5-flash-lite no debe estar en el tope",
);

assert.doesNotMatch(quotaTf, /PaidTier3/, "el tier 3 no debe estar en el tope");

assert.match(quotaTf, /preferred_value\s*=\s*var\.gemini_daily_request_cap/);
assert.match(quotaTf, /ignore_safety_checks\s*=\s*"QUOTA_DECREASE_PERCENTAGE_TOO_HIGH"/);

assert.match(
  variablesTf,
  /variable\s+"gemini_daily_request_cap"[\s\S]*?default\s*=\s*150/,
  "el tope por defecto debe ser 150 peticiones al día",
);
