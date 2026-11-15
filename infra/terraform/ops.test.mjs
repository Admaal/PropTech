import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mainTf = await readFile(new URL("./main.tf", import.meta.url), "utf8");
const opsTf = await readFile(new URL("./ops.tf", import.meta.url), "utf8");
const variablesTf = await readFile(new URL("./variables.tf", import.meta.url), "utf8");

// A1: las APIs de facturación exigen proyecto de cuota; sin esto el plan completo falla con 403.
assert.match(mainTf, /provider\s+"google"\s*\{[\s\S]*?user_project_override\s*=\s*true/);
assert.match(mainTf, /provider\s+"google"\s*\{[\s\S]*?billing_project\s*=\s*var\.project_id/);

// A2: alerta cuando llega un mensaje a la DLQ.
assert.match(opsTf, /resource\s+"google_monitoring_alert_policy"\s+"analysis_dlq"/);
assert.match(opsTf, /pubsub\.googleapis\.com\/topic\/send_message_operation_count/);
assert.match(opsTf, /resource\.labels\.topic_id\s*=\s*\\"analysis-jobs-dlq\\"/);
assert.match(opsTf, /comparison\s*=\s*"COMPARISON_GT"/);
assert.match(opsTf, /threshold_value\s*=\s*0/);
assert.match(opsTf, /resource\s+"google_monitoring_notification_channel"\s+"alert_email"/);
assert.match(opsTf, /type\s*=\s*"email"/);
assert.match(opsTf, /email_address\s*=\s*var\.alert_email/);
assert.match(opsTf, /notification_channels\s*=\s*\[google_monitoring_notification_channel\.alert_email\.id\]/);

// La métrica solo tiene datos cuando hay un mensaje en la DLQ. Sin esto, el incidente se queda
// abierto días y un segundo mensaje no generaría un aviso nuevo (comprobado en la prueba de fallo).
// evaluation_missing_data exige una duración distinta de cero: con "0s" la API de Monitoring rechaza
// el cambio al aplicar (terraform plan y validate no lo detectan). Se usa solo auto_close.
const opsCode = opsTf
  .split("\n")
  .filter((line) => !line.trim().startsWith("#"))
  .join("\n");
assert.doesNotMatch(
  opsCode,
  /evaluation_missing_data/,
  "con duration 0s la API rechaza evaluation_missing_data; el cierre del incidente va con auto_close",
);
assert.match(opsTf, /duration\s*=\s*"0s"/, "la duración 0s permite que un mensaje suelto dispare la alerta");
assert.match(
  opsTf,
  /alert_strategy\s*\{[\s\S]*?auto_close\s*=\s*"1800s"/,
  "el incidente debe cerrarse solo a los 30 minutos",
);

// El email no se versiona: la variable no tiene valor por defecto y no hay direcciones en el repo.
const alertEmailBlock = variablesTf.match(/variable\s+"alert_email"\s*\{([^}]*)\}/);
assert.ok(alertEmailBlock, "debe existir la variable alert_email");
assert.doesNotMatch(alertEmailBlock[1], /default\s*=/, "alert_email no debe tener valor por defecto");
assert.doesNotMatch(opsTf + variablesTf + mainTf, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(com|es|org)\b/);

console.log("Ops Terraform contract passed");
