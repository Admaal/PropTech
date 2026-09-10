import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const markdownFiles = execFileSync("git", ["ls-files", "*.md"], {
  cwd: root,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean);
const linkPattern = /\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const missing = [];

for (const file of markdownFiles) {
  const absoluteFile = resolve(root, file);
  if (!existsSync(absoluteFile)) continue;

  const content = readFileSync(absoluteFile, "utf8");
  for (const match of content.matchAll(linkPattern)) {
    const target = match[1];
    if (
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:") ||
      target.startsWith("#")
    ) {
      continue;
    }

    const pathPart = target.split("#", 1)[0];
    if (!pathPart) continue;

    const targetPath = resolve(dirname(resolve(root, file)), pathPart);
    if (!existsSync(targetPath)) missing.push(`${file} -> ${target}`);
  }
}

if (missing.length > 0) {
  console.error("Broken documentation links:");
  for (const link of missing) console.error(`- ${link}`);
  process.exitCode = 1;
} else {
  console.log("Documentation links passed.");
}
