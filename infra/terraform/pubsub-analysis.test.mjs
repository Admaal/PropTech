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

assert.match(
  pubsubTf,
  /resource\s+"google_pubsub_subscription"\s+"analysis_push"/,
  "debe existir una suscripción push",
);
assert.match(
  pubsubTf,
  /push_endpoint\s*=\s*"\$\{google_cloud_run_v2_service\.mcp_ai\.uri\}\/pubsub\/analyze"/,
);
assert.match(
  pubsubTf,
  /oidc_token\s*\{[\s\S]*?service_account_email\s*=\s*google_service_account\.analysis_push\.email/,
  "el push debe ir firmado por OIDC con una cuenta propia",
);
assert.match(pubsubTf, /ack_deadline_seconds\s*=\s*600/);
assert.match(pubsubTf, /minimum_backoff\s*=\s*"10s"/);
assert.match(pubsubTf, /maximum_backoff\s*=\s*"600s"/);

assert.match(
  pubsubTf,
  /dead_letter_policy\s*\{[\s\S]*?max_delivery_attempts\s*=\s*5/,
  "la DLQ debe activarse tras 5 entregas",
);

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

// El agente de Pub/Sub puede firmar tokens para la cuenta de push y gestionar la DLQ.
assert.match(pubsubTf, /roles\/iam\.serviceAccountTokenCreator/);
assert.match(pubsubTf, /roles\/pubsub\.subscriber/);

// mcp-ai responde dentro de la petición: el timeout debe cubrir el análisis.
assert.match(
  mainTf,
  /google_cloud_run_v2_service"\s+"mcp_ai"[\s\S]*?timeout\s*=\s*"600s"/,
  "mcp-ai necesita timeout de 600 s para el push síncrono",
);

assert.match(
  variablesTf,
  /variable\s+"analysis_topic"[\s\S]*?default\s*=\s*"analysis-jobs"/,
);

console.log("Pub/Sub analysis Terraform contract passed");
