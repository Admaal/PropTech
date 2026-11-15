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

// Comprobado en producción: con la configuración por defecto el incidente se abre al llegar un
// mensaje a la DLQ y se cierra solo (~1 min) al terminar la ventana, por lo que un mensaje posterior
// debería avisar de nuevo. No hace falta alert_strategy ni evaluation_missing_data (este último, además,
// exige una duración distinta de cero y la API lo rechaza con "0s").
const opsCode = opsTf
  .split("\n")
  .filter((line) => !line.trim().startsWith("#"))
  .join("\n");
assert.doesNotMatch(opsCode, /alert_strategy/, "el cierre del incidente por defecto ya es correcto");
assert.doesNotMatch(opsCode, /evaluation_missing_data/, "la API lo rechaza con duration 0s");
assert.match(opsTf, /duration\s*=\s*"0s"/, "la duración 0s permite que un mensaje suelto dispare la alerta");

// El email no se versiona: la variable no tiene valor por defecto y no hay direcciones en el repo.
const alertEmailBlock = variablesTf.match(/variable\s+"alert_email"\s*\{([^}]*)\}/);
assert.ok(alertEmailBlock, "debe existir la variable alert_email");
assert.doesNotMatch(alertEmailBlock[1], /default\s*=/, "alert_email no debe tener valor por defecto");
assert.doesNotMatch(opsTf + variablesTf + mainTf, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(com|es|org)\b/);

console.log("Ops Terraform contract passed");
