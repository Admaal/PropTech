import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pubsubTf = await readFile(new URL("./pubsub-analysis.tf", import.meta.url), "utf8");
const mainTf = await readFile(new URL("./main.tf", import.meta.url), "utf8");
const variablesTf = await readFile(new URL("./variables.tf", import.meta.url), "utf8");

assert.match(
  pubsubTf,
  /resource\s+"google_project_service"\s+"pubsub"[\s\S]*?service\s*=\s*"pubsub\.googleapis\.com"/,
  "la API de Pub/Sub debe habilitarse en Terraform",
);

assert.match(pubsubTf, /resource\s+"google_pubsub_topic"\s+"analysis_jobs"/);
assert.match(pubsubTf, /resource\s+"google_pubsub_topic"\s+"analysis_jobs_dlq"/);
assert.match(pubsubTf, /name\s*=\s*var\.analysis_topic/);
assert.match(pubsubTf, /"analysis-jobs-dlq"/);

assert.match(pubsubTf, /resource\s+"google_pubsub_subscription"\s+"analysis_push"/);
assert.match(
  pubsubTf,
  /push_endpoint\s*=\s*"\$\{var\.mcp_ai_url\}\/pubsub\/analyze"/,
  "el push debe apuntar a la URL de mcp-ai por variable (evita ciclo con su propia config)",
);
assert.match(
  pubsubTf,
  /oidc_token\s*\{[\s\S]*?service_account_email\s*=\s*google_service_account\.analysis_push\.email/,
  "el push debe ir firmado por OIDC con una cuenta propia",
);
assert.match(pubsubTf, /ack_deadline_seconds\s*=\s*600/);
assert.match(pubsubTf, /minimum_backoff\s*=\s*"10s"/);
assert.match(pubsubTf, /maximum_backoff\s*=\s*"600s"/);
assert.match(pubsubTf, /dead_letter_policy\s*\{[\s\S]*?max_delivery_attempts\s*=\s*5/);

// Permisos mínimos: la cuenta del server solo publica en el topic, no en el proyecto.
assert.match(
  pubsubTf,
  /google_pubsub_topic_iam_member"\s+"server_publisher"[\s\S]*?role\s*=\s*"roles\/pubsub\.publisher"[\s\S]*?server_runtime\.email/,
);
assert.doesNotMatch(
  pubsubTf,
  /google_project_iam_member[\s\S]*?pubsub\.(publisher|admin)/,
  "no se concede Pub/Sub a nivel de proyecto",
);

// La cuenta de push puede invocar mcp-ai; nada más.
assert.match(
  pubsubTf,
  /google_cloud_run_v2_service_iam_member"\s+"analysis_push_invoker"[\s\S]*?role\s*=\s*"roles\/run\.invoker"[\s\S]*?analysis_push\.email/,
);

assert.match(pubsubTf, /roles\/iam\.serviceAccountTokenCreator/);
assert.match(pubsubTf, /roles\/pubsub\.subscriber/);

// Corte (PR 5b): el server publica en Pub/Sub y ya no necesita invocar mcp-ai por HTTP.
assert.match(
  mainTf,
  /name\s*=\s*"ANALYSIS_TRANSPORT"\s*\n\s*value\s*=\s*"pubsub"/,
  "el server debe usar el transporte pubsub en producción",
);
assert.match(
  mainTf,
  /name\s*=\s*"GCP_PROJECT_ID"\s*\n\s*value\s*=\s*var\.project_id/,
);
assert.match(
  mainTf,
  /name\s*=\s*"PUBSUB_PUSH_AUDIENCE"\s*\n\s*value\s*=\s*"\$\{var\.mcp_ai_url\}\/pubsub\/analyze"/,
  "mcp-ai debe validar la misma audiencia que usa la suscripción",
);
assert.match(
  mainTf,
  /name\s*=\s*"PUBSUB_PUSH_SERVICE_ACCOUNT"\s*\n\s*value\s*=\s*google_service_account\.analysis_push\.email/,
);
assert.doesNotMatch(
  mainTf,
  /resource\s+"google_cloud_run_v2_service_iam_member"\s+"mcp_ai_server_invoker"/,
  "la cuenta del server no debe invocar mcp-ai directamente",
);

assert.match(
  variablesTf,
  /variable\s+"mcp_ai_url"[\s\S]*?default\s*=\s*"https:\/\/proptech-mcp-ai-7fhpow7ara-ew\.a\.run\.app"/,
);

// mcp-ai responde dentro de la petición: el timeout debe cubrir el análisis.
assert.match(
  mainTf,
  /google_cloud_run_v2_service"\s+"mcp_ai"[\s\S]*?timeout\s*=\s*"600s"/,
);

assert.match(
  variablesTf,
  /variable\s+"analysis_topic"[\s\S]*?default\s*=\s*"analysis-jobs"/,
);

console.log("Pub/Sub analysis Terraform contract passed");
