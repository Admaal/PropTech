import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

assert.match(workflow, /fetch-depth:\s*0/);
assert.match(workflow, /pnpm scan:secrets/);
assert.match(workflow, /pnpm check:docs/);
assert.match(workflow, /pnpm test:contracts/);
assert.match(workflow, /terraform .* validate/);
assert.match(workflow, /docker build -f apps\/server\/Dockerfile/);
assert.match(workflow, /docker build -f services\/mcp-ai\/Dockerfile/);
assert.match(workflow, /name: Web unit tests[\s\S]+pnpm --filter @proptech\/web test/);
assert.match(workflow, /name: Server tests \(RLS\)[\s\S]+pnpm --filter @proptech\/server test/);
assert.match(workflow, /name: MCP-AI tests[\s\S]+pnpm --filter @proptech\/mcp-ai test/);
assert.match(workflow, /RUN_SUPABASE_INTEGRATION:\s*true/);
assert.ok(
  workflow.includes("demo-member@test.com"),
  "CI debe usar la identidad member de seed si no hay secret dedicado",
);
assert.ok(
  workflow.includes(
    "secrets.MEMBER_USER_PASSWORD || secrets.DEMO_USER_PASSWORD",
  ),
  "CI debe reutilizar DEMO_USER_PASSWORD para el member",
);
assert.match(workflow, /github\.ref == 'refs\/heads\/master'/);
assert.doesNotMatch(workflow, /E2E omitido.*\n.*exit 0/);

console.log("CI gate contract passed");
