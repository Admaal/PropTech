import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mainTf = await readFile(new URL("./main.tf", import.meta.url), "utf8");

// El estado de Terraform vive en un bucket de GCS con versionado, no en la máquina de quien aplica.
assert.match(mainTf, /backend\s+"gcs"\s*\{[\s\S]*?bucket\s*=\s*"gen-lang-client-0665399020-tfstate"/);
assert.match(mainTf, /backend\s+"gcs"\s*\{[\s\S]*?prefix\s*=\s*"terraform\/state"/);

console.log("Backend Terraform contract passed");
