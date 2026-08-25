import type { MessageTree } from "./types.js";

export function assertMessageCatalogParity(
  left: MessageTree,
  right: MessageTree,
  leftLocale = "left",
  rightLocale = "right",
): void {
  const issues: string[] = [];
  compareNodes(left, right, [], leftLocale, rightLocale, issues);
  if (issues.length > 0) {
    throw new Error(`Message catalog mismatch:\n${issues.join("\n")}`);
  }
}

function compareNodes(
  left: string | MessageTree | undefined,
  right: string | MessageTree | undefined,
  path: string[],
  leftLocale: string,
  rightLocale: string,
  issues: string[],
) {
  const label = path.join(".") || "<root>";
  if (left === undefined) {
    issues.push(`${rightLocale} is missing ${label}`);
    return;
  }
  if (right === undefined) {
    issues.push(`${leftLocale} is missing ${label}`);
    return;
  }

  if (typeof left !== typeof right) {
    issues.push(`${label} changes type between ${leftLocale} and ${rightLocale}`);
    return;
  }

  if (typeof left === "string" && typeof right === "string") {
    const leftArgs = extractIcuArguments(left);
    const rightArgs = extractIcuArguments(right);
    if (leftArgs.join(",") !== rightArgs.join(",")) {
      issues.push(`${label} changes ICU arguments between ${leftLocale} and ${rightLocale}`);
    }
    return;
  }

  const leftTree = left as MessageTree;
  const rightTree = right as MessageTree;
  const keys = new Set([...Object.keys(leftTree), ...Object.keys(rightTree)]);
  for (const key of [...keys].sort()) {
    compareNodes(leftTree[key], rightTree[key], [...path, key], leftLocale, rightLocale, issues);
  }
}

export function extractIcuArguments(message: string): string[] {
  const argumentsFound = new Set<string>();
  const argumentPattern = /[{]([A-Za-z_][A-Za-z0-9_.-]*)[,}]/g;
  const compactMessage = message.replaceAll(" ", "");
  for (const match of compactMessage.matchAll(argumentPattern)) {
    const name = match[1];
    if (name) argumentsFound.add(name);
  }
  return [...argumentsFound].sort();
}
