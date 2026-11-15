import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mainTf = await readFile(new URL("./main.tf", import.meta.url), "utf8");

// El repositorio de imágenes está declarado en Terraform (antes solo lo creaba el script de arranque).
const repoBlock = mainTf.match(
  /resource\s+"google_artifact_registry_repository"\s+"proptech"\s*\{([\s\S]*?)\r?\n\}\r?\n/,
);
assert.ok(repoBlock, "debe existir google_artifact_registry_repository.proptech");
const repo = repoBlock[1];

assert.match(repo, /repository_id\s*=\s*var\.artifact_registry_repository/);
assert.match(repo, /format\s*=\s*"DOCKER"/);
assert.match(repo, /location\s*=\s*var\.region/);

// Sin dry_run = false el proveedor no borra nada y el repo seguiría creciendo.
assert.match(repo, /cleanup_policy_dry_run\s*=\s*false/);

// KEEP gana sobre DELETE: se conservan las últimas versiones y se borra lo viejo que no está entre ellas.
assert.match(
  repo,
  /cleanup_policies\s*\{[^}]*action\s*=\s*"KEEP"[^}]*most_recent_versions\s*\{[^}]*keep_count\s*=\s*5/,
);
assert.match(
  repo,
  /cleanup_policies\s*\{[^}]*action\s*=\s*"DELETE"[^}]*condition\s*\{[^}]*older_than\s*=\s*"604800s"/,
);

// Borrar el repo dejaría a Cloud Run sin imágenes que desplegar.
assert.match(repo, /lifecycle\s*\{[^}]*prevent_destroy\s*=\s*true/);

console.log("Artifact Registry Terraform contract passed");
