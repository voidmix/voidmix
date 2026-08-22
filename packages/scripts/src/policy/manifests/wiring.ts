import type { PolicyFinding } from "../checks.js";
import type { WorkspaceShape } from "../manifests.js";

function wiringFinding(location: string, message: string, fix: string): PolicyFinding {
  return { check: "tests.wiring", location, message, fix, severity: "warn" };
}

export function validateTestWiring(location: string, shape: WorkspaceShape): PolicyFinding[] {
  if (!shape.hasVitestConfig || shape.hasTestFiles) return [];
  return [
    wiringFinding(
      location,
      "has a vitest.config.ts and no test file, so its test scripts prove nothing",
      `add a test under ${location.replace(/\/[^/]+$/, "/src")}, or remove the vitest.config.ts and its test scripts`,
    ),
  ];
}
