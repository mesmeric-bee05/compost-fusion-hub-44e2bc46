#!/usr/bin/env bun
// Diffs a fresh scan result against the committed baseline.
// Fails (exit 1) when:
//   - any new finding with level=error appears, or
//   - the count of new warnings exceeds SEC_WARN_THRESHOLD (default 2).
//
// Usage: bun scripts/compare-findings.mjs <baseline.json> <scan.json>

import { readFileSync } from "node:fs";

const [baselinePath, scanPath] = process.argv.slice(2);
if (!baselinePath || !scanPath) {
  console.error("Usage: compare-findings.mjs <baseline.json> <scan.json>");
  process.exit(2);
}

const threshold = parseInt(process.env.SEC_WARN_THRESHOLD ?? "2", 10);
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const scan = JSON.parse(readFileSync(scanPath, "utf8"));

const keyOf = (f) => `${f.id}::${f.name}`;
const baselineKeys = new Set((baseline.findings ?? []).map(keyOf));

const newFindings = (scan.findings ?? []).filter((f) => !baselineKeys.has(keyOf(f)));
const newErrors = newFindings.filter((f) => f.level === "error");
const newWarns = newFindings.filter((f) => f.level === "warn");

console.log(`Baseline findings: ${(baseline.findings ?? []).length}`);
console.log(`Scan findings:     ${(scan.findings ?? []).length}`);
console.log(`New errors:        ${newErrors.length}`);
console.log(`New warnings:      ${newWarns.length} (threshold ${threshold})`);

for (const f of newFindings) {
  console.log(`  [${f.level}] ${f.name} — ${f.id}`);
}

if (newErrors.length > 0) {
  console.error("FAIL: new high-severity findings detected.");
  process.exit(1);
}
if (newWarns.length > threshold) {
  console.error(`FAIL: new warnings (${newWarns.length}) exceed threshold (${threshold}).`);
  process.exit(1);
}
console.log("PASS");
