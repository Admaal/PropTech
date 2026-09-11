import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const googleApiPrefix = ["AI", "za"].join("");
const patterns = [
  {
    name: "private-key",
    regex: new RegExp(`-----BEGIN [A-Z ]+${"PRIVATE KEY"}-----`),
  },
  {
    name: "google-api-key",
    regex: new RegExp(`${googleApiPrefix}[A-Za-z0-9_-]{20,}`),
  },
  {
    name: "github-token",
    regex: /\b(?:gh[ps]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
  },
  {
    name: "jwt",
    regex: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    name: "secret-assignment",
    regex:
      /\b(?:SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY|INTERNAL_SERVICE_KEY|DEMO_USER_PASSWORD|PLATFORM_ADMIN_PASSWORD)\s*=\s*(?!your-|replace-with|<|["']?CHANGE|["']?$)[^\s#"'`]+/,
  },
];

function runGit(args) {
  return execFileSync("git", args, {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function trackedSnapshot() {
  return runGit(["ls-files", "-co", "--exclude-standard"])
    .split(/\r?\n/)
    .filter(Boolean);
}

function localEnvSnapshot() {
  return [
    ".env",
    ".env.local",
    "apps/web/.env.local",
    "apps/server/.env.local",
    "services/mcp-ai/.env.local",
  ].filter((path) => existsSync(new URL(`../${path}`, import.meta.url)));
}

function scanText(path, text, location, findings) {
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      findings.push(`${location}:${path} (${pattern.name})`);
    }
  }
}

function scanWorkingTree(findings) {
  for (const path of new Set([...trackedSnapshot(), ...localEnvSnapshot()])) {
    try {
      scanText(path, readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), "worktree", findings);
    } catch {
      // Binary or concurrently removed files are not text scan candidates.
    }
  }
}

function scanHistory(findings) {
  const revisions = runGit(["rev-list", "--all"])
    .split(/\r?\n/)
    .filter(Boolean);

  for (const revision of revisions) {
    for (const pattern of patterns) {
      try {
        const matches = runGit([
          "grep",
          "-I",
          "-l",
          "-E",
          pattern.regex.source,
          revision,
          "--",
        ]);
        for (const path of matches.split(/\r?\n/).filter(Boolean)) {
          findings.push(`history:${revision}:${path} (${pattern.name})`);
        }
      } catch {
        // git grep returns 1 when there are no matches.
      }
    }
  }
}

const findings = [];
scanWorkingTree(findings);
scanHistory(findings);

if (findings.length > 0) {
  console.error("Secret scan failed. Findings are reported without values:");
  for (const finding of [...new Set(findings)]) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log("Secret scan passed: no blocking patterns found.");
}
