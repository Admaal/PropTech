import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mainTerraform = await readFile(new URL("./main.tf", import.meta.url), "utf8");
const variablesTerraform = await readFile(
  new URL("./variables.tf", import.meta.url),
  "utf8",
);

assert.match(mainTerraform, /resource\s+"google_cloudbuild_trigger"\s+"deploy_main"/);
assert.match(mainTerraform, /branch\s*=\s*"\^main\$"/);
assert.match(mainTerraform, /service_account\s*=\s*google_service_account\.cloud_build\.id/);
assert.match(
  mainTerraform,
  /google_artifact_registry_repository_iam_member"\s+"cloud_build_writer"/,
);
assert.match(
  mainTerraform,
  /google_cloud_run_v2_service_iam_member"\s+"cloud_build_server_developer"/,
);
assert.match(
  mainTerraform,
  /google_cloud_run_v2_service_iam_member"\s+"cloud_build_mcp_ai_developer"/,
);
assert.match(
  mainTerraform,
  /google_service_account_iam_member"\s+"cloud_build_can_act_as_runtime"/,
);
assert.match(
  mainTerraform,
  /ignore_changes\s*=\s*\[[\s\S]*template\[0\]\.containers\[0\]\.image/,
);
assert.match(mainTerraform, /resource\s+"google_billing_budget"\s+"project"/);
assert.match(mainTerraform, /threshold_percent\s*=\s*0\.5/);
assert.match(mainTerraform, /threshold_percent\s*=\s*1\.0/);
assert.match(variablesTerraform, /variable\s+"artifact_registry_repository"/);
assert.match(variablesTerraform, /variable\s+"billing_account_id"/);
assert.match(variablesTerraform, /variable\s+"github_owner"/);
assert.match(variablesTerraform, /variable\s+"github_repository"/);

console.log("Cloud Build Terraform contract passed");
