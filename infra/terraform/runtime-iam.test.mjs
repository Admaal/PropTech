import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mainTerraform = await readFile(new URL("./main.tf", import.meta.url), "utf8");

assert.match(
  mainTerraform,
  /resource\s+"google_service_account"\s+"server_runtime"/,
);
assert.match(
  mainTerraform,
  /resource\s+"google_service_account"\s+"mcp_ai_runtime"/,
);
assert.match(
  mainTerraform,
  /service_account\s*=\s*google_service_account\.server_runtime\.email/,
);
assert.match(
  mainTerraform,
  /service_account\s*=\s*google_service_account\.mcp_ai_runtime\.email/,
);
assert.match(
  mainTerraform,
  /google_secret_manager_secret_iam_member"\s+"server_runtime_secrets"/,
);
assert.match(
  mainTerraform,
  /google_secret_manager_secret_iam_member"\s+"mcp_ai_runtime_secrets"/,
);
assert.match(
  mainTerraform,
  /member\s*=\s*"serviceAccount:\$\{google_service_account\.server_runtime\.email\}"/,
);
assert.match(
  mainTerraform,
  /member\s*=\s*"serviceAccount:\$\{google_service_account\.mcp_ai_runtime\.email\}"/,
);
assert.doesNotMatch(
  mainTerraform,
  /name\s*=\s*"default"[\s\S]{0,200}service_account\s*=/,
);

console.log("Runtime IAM Terraform contract passed");
