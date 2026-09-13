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

  function skipQuoted(offset: number, end: number): number {
    const next = message[offset + 1];
    // An apostrophe quotes ICU syntax only when it precedes a syntax character.
    if (next !== "'" && next !== "{" && next !== "}" && next !== "#") return offset + 1;
    let index = offset + 1;
    while (index < end) {
      if (message[index] !== "'") {
        index += 1;
        continue;
      }
      if (message[index + 1] === "'") {
        index += 2;
        continue;
      }
      return index + 1;
    }
    return end;
  }

  function matchingBrace(offset: number, end: number): number {
    let depth = 1;
    let index = offset + 1;
    while (index < end) {
      const character = message[index];
      if (character === "'") {
        index = skipQuoted(index, end);
        continue;
      }
      if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        if (depth === 0) return index;
      }
      index += 1;
    }
    return -1;
  }

  function scanMessage(start: number, end: number): void {
    let index = start;
    while (index < end) {
      const character = message[index];
      if (character === "'") {
        index = skipQuoted(index, end);
        continue;
      }
      if (character !== "{") {
        index += 1;
        continue;
      }
      const argumentEnd = parseArgument(index, end);
      index = argumentEnd > index ? argumentEnd : index + 1;
    }
  }

  function parseArgument(offset: number, end: number): number {
    const close = matchingBrace(offset, end);
    if (close < 0) return end;
    let index = offset + 1;
    while (index < close && /\s/u.test(message[index] ?? "")) index += 1;
    const nameStart = index;
    while (index < close && /[A-Za-z0-9_.-]/u.test(message[index] ?? "")) index += 1;
    const name = message.slice(nameStart, index);
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/u.test(name)) return close + 1;
    while (index < close && /\s/u.test(message[index] ?? "")) index += 1;
    argumentsFound.add(name);
    if (message[index] !== ",") return close + 1;

    index += 1;
    while (index < close && /\s/u.test(message[index] ?? "")) index += 1;
    const styleStart = index;
    while (index < close && message[index] !== "," && message[index] !== "}") index += 1;
    const style = message.slice(styleStart, index).trim().toLowerCase();
    if (!/^(?:select|plural|selectordinal)$/u.test(style) || message[index] !== ",") {
      // Number/date/time styles may contain nested custom arguments.
      scanMessage(styleStart, close);
      return close + 1;
    }

    index += 1;
    while (index < close) {
      while (index < close && /\s/u.test(message[index] ?? "")) index += 1;
      while (index < close && !/\s/u.test(message[index] ?? "") && message[index] !== "{") {
        index += 1;
      }
      while (index < close && /\s/u.test(message[index] ?? "")) index += 1;
      if (message[index] !== "{") {
        index += 1;
        continue;
      }
      const branchClose = matchingBrace(index, close);
      if (branchClose < 0) break;
      scanMessage(index + 1, branchClose);
      index = branchClose + 1;
    }
    return close + 1;
  }

  scanMessage(0, message.length);
  return [...argumentsFound].sort();
}
