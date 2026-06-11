#!/usr/bin/env bun
// Fetches the latest Lovable/Supabase security scan results for the project
// and prints them as JSON to stdout. Requires LOVABLE_API_KEY and
// LOVABLE_PROJECT_ID secrets. Used by the security-scan GitHub workflow.

const apiKey = process.env.LOVABLE_API_KEY;
const projectId = process.env.LOVABLE_PROJECT_ID;
if (!apiKey || !projectId) {
  console.error("Missing LOVABLE_API_KEY or LOVABLE_PROJECT_ID env var");
  process.exit(2);
}

const res = await fetch(
  `https://api.lovable.dev/v1/projects/${projectId}/security/scan`,
  { method: "POST", headers: { Authorization: `Bearer ${apiKey}` } },
);

if (!res.ok) {
  console.error(`Scan request failed: HTTP ${res.status}`);
  process.exit(2);
}

const data = await res.json();
process.stdout.write(JSON.stringify(data, null, 2));
