import { createScanner, LanguageVariant, SyntaxKind } from "typescript/unstable/ast";

export const supportedLocales = ["en", "zh"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export type I18nCheckName =
  | "catalog.parse"
  | "catalog.parity"
  | "source.facade"
  | "source.hardcoded"
  | "source.locale";

export interface I18nFinding {
  check: I18nCheckName;
  column: number;
  fix: string;
  line: number;
  location: string;
  message: string;
  severity: "error" | "warn";
}

export interface I18nReport {
  errors: number;
  findings: I18nFinding[];
  warnings: number;
}

export interface CatalogInput {
  content: string;
  locale: SupportedLocale;
  location: string;
  surface: "web" | "desktop" | "mail";
}

export interface SourceInput {
  content: string;
  location: string;
}

interface SourceToken {
  end: number;
  kind: number;
  start: number;
  text: string;
  value: string;
}

interface TokenDepth {
  brace: number;
  bracket: number;
  paren: number;
}

type MessageNode = string | { [key: string]: MessageNode };

const uiPropertyNames = new Set([
  "alt",
  "ariaDescription",
  "ariaLabel",
  "description",
  "detail",
  "empty",
  "error",
  "fallback",
  "heading",
  "helperText",
  "label",
  "message",
  "placeholder",
  "subtitle",
  "text",
  "title",
  "tooltip",
]);

const uiAttributeNames = new Set([
  "alt",
  "aria-description",
  "aria-label",
  "aria-placeholder",
  "aria-valuetext",
  "placeholder",
  "title",
]);

const uiVariableSuffix =
  /(?:Label|Title|Description|Message|Text|Placeholder|Tooltip|Heading|Subtitle)$/u;

// `content` is intentionally limited to conditional object expressions below:
// metadata uses it for descriptions, while transport and chat payloads also
// use the same property for arbitrary user data.
const conditionalUiPropertyNames = new Set([...uiPropertyNames, "content"]);

const commonUiWords = new Set([
  "active",
  "all",
  "back",
  "cancel",
  "chinese",
  "close",
  "complete",
  "create",
  "delete",
  "description",
  "disabled",
  "download",
  "edit",
  "email",
  "enabled",
  "error",
  "home",
  "inbox",
  "language",
  "library",
  "loading",
  "login",
  "logout",
  "next",
  "no",
  "offline",
  "online",
  "open",
  "overview",
  "password",
  "projects",
  "remove",
  "retry",
  "save",
  "search",
  "settings",
  "sign",
  "submit",
  "today",
  "upload",
  "verify",
  "warning",
  "welcome",
]);

const allowedLiteralValues = new Set(["Pi", "VoidMix", "Voidmix", "VOIDMIX", "Northstar"]);

const technicalJsxTextPatterns = [
  // Keyboard shortcuts and initials are visual affordances, not locale copy.
  /^[A-Za-z]$/u,
  // A version prefix may be adjacent to a dynamic version expression.
  /^v(?:\d+(?:\.\d+){1,3})?$/iu,
  // Size/unit suffixes are structural metadata (for example `· ≤512 KB`).
  /^[·•]\s*[<>=≤≥]?\s*\d+(?:\.\d+)?\s*(?:B|KB|MB|GB|TB)$/iu,
  // Product/workspace breadcrumbs keep a brand and a route-like segment.
  /^(?:VOIDMIX|Voidmix)(?:\s*\/\s*[A-Za-z][A-Za-z0-9 _-]*)?\s*\/?$/u,
  // A separator followed by a route-like segment is the other half of a
  // dynamic brand breadcrumb (`{workspace} / Chat`).
  /^\/\s*[A-Za-z][A-Za-z0-9 _-]*$/u,
  /^Northstar(?:\s+Workspace)?$/u,
];

const sourceFacadeAllowlist = new Set([
  "apps/web/src/i18n/client.ts",
  "apps/desktop/src/i18n/client.ts",
]);

const sourceRecoveryAllowlist = new Set([
  "apps/web/src/i18n/recovery-messages.ts",
  "apps/web/src/i18n/error-message.ts",
]);

const operationalSourceAllowlist = [
  /^packages\/mail\/src\/(?:env|service|transports)\//,
  /^packages\/mail\/src\/service\.ts$/,
  /^apps\/(?:web|desktop)\/src\/env\.ts$/,
];

// These modules contain transport/domain snapshots. Their strings are data
// rendered through a resolver at the UI boundary, so property-name heuristics
// must not treat them as copy. JSX and explicit accessibility attributes are
// still checked when they occur in a component source file.
const structuredDataSourceAllowlist = [
  /(?:^|\/)preview-adapter\.[jt]sx?$/u,
  /(?:^|\/)remote-adapter\.[jt]sx?$/u,
  /(?:^|\/)fixtures\.[jt]sx?$/u,
  /(?:^|\/)types\.[jt]sx?$/u,
  /(?:^|\/)lib\/project-studio\.[jt]sx?$/u,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMessageNode(value: unknown): value is MessageNode {
  return (
    typeof value === "string" ||
    (isRecord(value) && Object.values(value).every((child) => isMessageNode(child)))
  );
}

function finding(
  check: I18nCheckName,
  location: string,
  message: string,
  fix: string,
  content = "",
  offset = 0,
): I18nFinding {
  const lineStart = content.lastIndexOf("\n", offset - 1);
  const line = content.slice(0, offset).split("\n").length;
  return {
    check,
    column: offset - lineStart,
    fix,
    line,
    location,
    message,
    severity: "error",
  };
}

function parseCatalog(input: CatalogInput): { findings: I18nFinding[]; value?: MessageNode } {
  try {
    const value: unknown = JSON.parse(input.content);
    if (!isMessageNode(value)) {
      return {
        findings: [
          finding(
            "catalog.parse",
            input.location,
            "catalog root must be an object or string message tree",
            "make the catalog a JSON object whose leaves are strings",
          ),
        ],
      };
    }
    return { findings: [], value };
  } catch {
    return {
      findings: [
        finding(
          "catalog.parse",
          input.location,
          "is not valid JSON",
          "repair the catalog; message files must contain strict JSON",
        ),
      ],
    };
  }
}

function extractIcuArguments(message: string): string[] {
  const names = new Set<string>();

  function skipQuoted(offset: number, end: number): number {
    const next = message[offset + 1];
    // An apostrophe only quotes ICU syntax when it precedes a syntax
    // character. Ordinary contractions such as `Today's {date}` must leave
    // the following argument visible to the scanner.
    if (next !== "'" && next !== "{" && next !== "}" && next !== "#") return offset + 1;
    let index = offset + 1;
    // ICU uses apostrophes to quote syntax characters. Treating the quoted
    // span as opaque keeps braces in copy from changing nesting depth.
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
    names.add(name);
    if (message[index] !== ",") return close + 1;

    index += 1;
    while (index < close && /\s/u.test(message[index] ?? "")) index += 1;
    const styleStart = index;
    while (index < close && message[index] !== "," && message[index] !== "}") index += 1;
    const style = message.slice(styleStart, index).trim().toLowerCase();
    if (!/^(?:select|plural|selectordinal)$/u.test(style) || message[index] !== ",") {
      // Number/date/time styles do not contain branch message braces in the
      // catalogs. Scan any nested braces conservatively for custom formats.
      scanMessage(styleStart, close);
      return close + 1;
    }

    // Branch labels (`one`, `other`, `active`, `=0`) are syntax, while braces
    // inside each branch are a nested ICU message and may contain real args.
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
  return [...names].sort();
}

function compareCatalogNodes(
  left: MessageNode | undefined,
  right: MessageNode | undefined,
  path: readonly string[],
  leftLocale: SupportedLocale,
  rightLocale: SupportedLocale,
  location: string,
  findings: I18nFinding[],
): void {
  const label = path.join(".") || "<root>";
  if (left === undefined) {
    findings.push(
      finding(
        "catalog.parity",
        location,
        `${leftLocale} is missing ${label}`,
        `add ${label} to the ${leftLocale} and ${rightLocale} catalogs`,
      ),
    );
    return;
  }
  if (right === undefined) {
    findings.push(
      finding(
        "catalog.parity",
        location,
        `${rightLocale} is missing ${label}`,
        `add ${label} to the ${leftLocale} and ${rightLocale} catalogs`,
      ),
    );
    return;
  }

  if (typeof left !== typeof right) {
    findings.push(
      finding(
        "catalog.parity",
        location,
        `${label} changes node type between ${leftLocale} and ${rightLocale}`,
        "keep the same object or string shape in both catalogs",
      ),
    );
    return;
  }

  if (typeof left === "string" && typeof right === "string") {
    const leftArguments = extractIcuArguments(left);
    const rightArguments = extractIcuArguments(right);
    if (leftArguments.join(",") !== rightArguments.join(",")) {
      findings.push(
        finding(
          "catalog.parity",
          location,
          `${label} changes ICU arguments between ${leftLocale} and ${rightLocale}`,
          `keep ICU argument names aligned: ${leftArguments.join(", ") || "none"}`,
        ),
      );
    }
    return;
  }

  const leftObject = left as Record<string, MessageNode>;
  const rightObject = right as Record<string, MessageNode>;
  const keys = new Set([...Object.keys(leftObject), ...Object.keys(rightObject)]);
  for (const key of [...keys].sort()) {
    compareCatalogNodes(
      leftObject[key],
      rightObject[key],
      [...path, key],
      leftLocale,
      rightLocale,
      location,
      findings,
    );
  }
}

/** Checks one pair of locale catalogs without touching the filesystem. */
export function checkCatalogPair(left: CatalogInput, right: CatalogInput): I18nFinding[] {
  const findings: I18nFinding[] = [];
  if (left.surface !== right.surface) {
    findings.push(
      finding(
        "catalog.parity",
        left.location,
        `catalog pair crosses surfaces (${left.surface} and ${right.surface})`,
        "compare catalogs owned by the same surface",
      ),
    );
    return findings;
  }
  if (left.locale === right.locale) {
    findings.push(
      finding(
        "catalog.parity",
        left.location,
        "catalog pair must contain two different locales",
        "provide exactly one en catalog and one zh catalog",
      ),
    );
    return findings;
  }

  const parsedLeft = parseCatalog(left);
  const parsedRight = parseCatalog(right);
  findings.push(...parsedLeft.findings, ...parsedRight.findings);
  if (!parsedLeft.value || !parsedRight.value) return findings;

  compareCatalogNodes(
    parsedLeft.value,
    parsedRight.value,
    [],
    left.locale,
    right.locale,
    `${left.location} <-> ${right.location}`,
    findings,
  );
  return findings;
}

function tokenizeSource(source: string): SourceToken[] {
  const scanner = createScanner(true, LanguageVariant.JSX, source);
  const tokens: SourceToken[] = [];
  while (true) {
    const kind = scanner.scan();
    if (kind === SyntaxKind.EndOfFile) break;
    tokens.push({
      end: scanner.getTokenEnd(),
      kind,
      start: scanner.getTokenStart(),
      text: scanner.getTokenText(),
      value: scanner.getTokenValue(),
    });
  }
  return tokens;
}

/** Returns delimiter depths immediately before each token. */
function tokenDepths(tokens: readonly SourceToken[]): TokenDepth[] {
  let brace = 0;
  let bracket = 0;
  let paren = 0;
  return tokens.map((token) => {
    const depth = { brace, bracket, paren };
    if (token.text === "{") brace += 1;
    else if (token.text === "}") brace = Math.max(0, brace - 1);
    else if (token.text === "[") bracket += 1;
    else if (token.text === "]") bracket = Math.max(0, bracket - 1);
    else if (token.text === "(") paren += 1;
    else if (token.text === ")") paren = Math.max(0, paren - 1);
    return depth;
  });
}

function isLikelyHumanText(value: string, force = false): boolean {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || !/[A-Za-z\u00c0-\u024f\u4e00-\u9fff]/u.test(normalized)) return false;
  if (allowedLiteralValues.has(normalized)) return false;
  if (/^(?:https?|mailto|data):/u.test(normalized)) return false;
  // Input examples are structural values rather than locale copy.
  if (/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/u.test(normalized)) return false;
  // Import specifiers, routes, CSS classes, and enum-like values can contain
  // punctuation while still being implementation data. They are not copy.
  if (!force && /^(?:[@.#/~]|[A-Za-z_$][\w$.-]*\/)/u.test(normalized)) return false;
  if (!force && /^[A-Za-z_$][\w$.-]*$/u.test(normalized)) {
    const lower = normalized.toLowerCase();
    if (!commonUiWords.has(lower) && !/[A-Z][a-z]/u.test(normalized)) return false;
  }
  if (force) return true;
  if (commonUiWords.has(normalized.toLowerCase())) return true;
  if (
    /^(?:\d+\s+(?:min(?:ute)?s?|hr(?:s)?|hour?s?|day?s?)\s+ago|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})$/iu.test(
      normalized,
    )
  ) {
    return true;
  }
  // A sentence or Chinese copy is a strong signal. Bare personal/project names
  // such as "Mina Cole" remain domain content and are intentionally ignored.
  return /[.!?…]/u.test(normalized) || /[\u4e00-\u9fff]/u.test(normalized);
}

function isLikelyJsxText(value: string): boolean {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || !/[A-Za-z\u00c0-\u024f\u4e00-\u9fff]/u.test(normalized)) return false;
  if (allowedLiteralValues.has(normalized)) return false;
  if (/^(?:https?|mailto|data):/u.test(normalized)) return false;
  if (technicalJsxTextPatterns.some((pattern) => pattern.test(normalized))) return false;
  // Once a value has been parsed as a JSX text node, it is copy by definition;
  // a lower-case one-word label (for example `hello`) is still visible UI.
  // Entity-only whitespace such as `&nbsp;` is the one common non-copy case.
  return !/^(?:&(?:[A-Za-z][A-Za-z0-9]+|#\d+);\s*)+$/u.test(normalized);
}

function previousToken(
  tokens: readonly SourceToken[],
  index: number,
  distance = 1,
): SourceToken | undefined {
  return tokens[index - distance];
}

function callNameBefore(tokens: readonly SourceToken[], index: number): string | undefined {
  const previous = previousToken(tokens, index);
  if (!previous || previous.text !== "(") return undefined;
  const name = previousToken(tokens, index, 2);
  return name?.text;
}

function propertyNameBefore(tokens: readonly SourceToken[], index: number): string | undefined {
  const colon = previousToken(tokens, index);
  if (!colon || colon.text !== ":") return undefined;
  const key = previousToken(tokens, index, 2);
  if (!key) return undefined;
  // In `condition ? "text" : "password"`, the token before the colon is a
  // literal branch, not an object property. Restricting this helper to the
  // punctuation that can precede an object key also avoids type/ternary
  // expressions being mistaken for UI configuration.
  const beforeKey = previousToken(tokens, index, 3);
  if (beforeKey && !["{", ",", "..."].includes(beforeKey.text)) return undefined;
  return key.text.replace(/^['"]|['"]$/gu, "");
}

function objectPropertyNameAt(
  tokens: readonly SourceToken[],
  index: number,
  names: ReadonlySet<string>,
): string | undefined {
  const key = tokens[index];
  const colon = tokens[index + 1];
  if (!key || !colon || colon.text !== ":") return undefined;
  const beforeKey = tokens[index - 1];
  if (beforeKey && !["{", ",", "..."].includes(beforeKey.text)) return undefined;
  const name = key.text.replace(/^['"]|['"]$/gu, "");
  return names.has(name) ? name : undefined;
}

function hasConditionalBefore(
  tokens: readonly SourceToken[],
  depths: readonly TokenDepth[],
  start: number,
  end: number,
  base: TokenDepth,
): boolean {
  let conditional = false;
  for (let index = start; index < end; index += 1) {
    const token = tokens[index];
    const depth = depths[index];
    if (!token || !depth) continue;
    if (
      depth.brace === base.brace &&
      depth.paren === base.paren &&
      depth.bracket === base.bracket &&
      [",", ";", "}"].includes(token.text)
    ) {
      return false;
    }
    if (token.text === "?") conditional = true;
  }
  return conditional;
}

/** Finds a UI object property whose conditional expression contains a literal. */
function conditionalObjectPropertyBefore(
  tokens: readonly SourceToken[],
  depths: readonly TokenDepth[],
  index: number,
): string | undefined {
  const targetDepth = depths[index];
  if (!targetDepth) return undefined;
  for (let keyIndex = index - 1; keyIndex >= 0; keyIndex -= 1) {
    const name = objectPropertyNameAt(tokens, keyIndex, conditionalUiPropertyNames);
    const base = depths[keyIndex];
    if (!name || !base || targetDepth.brace !== base.brace) continue;
    if (hasConditionalBefore(tokens, depths, keyIndex + 2, index, base)) return name;
  }
  return undefined;
}

/** Finds a local UI-named variable whose conditional expression contains a literal. */
function conditionalUiVariableBefore(
  tokens: readonly SourceToken[],
  depths: readonly TokenDepth[],
  index: number,
): string | undefined {
  const targetDepth = depths[index];
  if (!targetDepth) return undefined;
  for (let nameIndex = index - 1; nameIndex >= 1; nameIndex -= 1) {
    const name = tokens[nameIndex]?.text;
    if (!name || !uiVariableSuffix.test(name)) continue;
    if (!["const", "let", "var"].includes(tokens[nameIndex - 1]?.text ?? "")) continue;
    if (tokens[nameIndex + 1]?.text !== "=") continue;
    const base = depths[nameIndex];
    if (!base || targetDepth.brace !== base.brace) continue;
    if (hasConditionalBefore(tokens, depths, nameIndex + 2, index, base)) return name;
  }
  return undefined;
}

function isStructuredDataSource(location: string): boolean {
  return structuredDataSourceAllowlist.some((pattern) => pattern.test(location));
}

function hasTranslationSibling(source: string, offset: number, property: string): boolean {
  const window = source.slice(Math.max(0, offset - 640), Math.min(source.length, offset + 640));
  const siblingNames = new Set<string>([
    `${property}Key`,
    ...(property === "label" ? ["messageKey", "nameKey"] : []),
    ...(property === "text" ? ["messageKey", "textKey"] : []),
  ]);
  return [...siblingNames].some((name) => new RegExp(`\\b${name}\\s*:`, "u").test(window));
}

function isLikelyTranslationKey(value: string): boolean {
  // Lower-camel identifiers are commonly catalog keys or domain enum values
  // (`campaignExports`, `open`, `in_progress`). Human copy with spaces or
  // sentence punctuation remains subject to the UI-property check.
  return /^[a-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*$/u.test(value);
}

function jsxAttributeBefore(source: string, offset: number): string | undefined {
  const prefix = source.slice(Math.max(0, offset - 180), offset);
  const match = prefix.match(/([A-Za-z_:][\w:.-]*)\s*=\s*(?:\{\s*)?$/u);
  return match?.[1];
}

function isTranslationCall(tokens: readonly SourceToken[], index: number): boolean {
  const name = callNameBefore(tokens, index);
  return name !== undefined && /^(?:t|\w*T|translate|formatMessage|getMessage)$/u.test(name);
}

function isInFormattingCall(tokens: readonly SourceToken[], index: number): boolean {
  const nearby = tokens
    .slice(Math.max(0, index - 10), index + 1)
    .map((token) => token.text)
    .join(" ");
  return /(?:Intl\s*\.\s*(?:DateTimeFormat|NumberFormat|RelativeTimeFormat)|toLocale(?:String|DateString)|createFormatter)/u.test(
    nearby,
  );
}

function isOperationalSource(location: string): boolean {
  return operationalSourceAllowlist.some((pattern) => pattern.test(location));
}

function sourceOffsetFinding(
  source: SourceInput,
  check: I18nCheckName,
  offset: number,
  message: string,
  fix: string,
): I18nFinding {
  return finding(check, source.location, message, fix, source.content, offset);
}

interface JsxTextRange {
  start: number;
  text: string;
}

interface JsxTag {
  attributes: JsxAttribute[];
  end: number;
  name: string;
  selfClosing: boolean;
}

interface JsxAttribute {
  name: string;
  literals: JsxAttributeLiteral[];
  renderedText: JsxTextRange[];
}

interface JsxAttributeLiteral {
  start: number;
  value: string;
}

interface JsxElement {
  end: number;
  text: JsxTextRange[];
}

function isJsxNameStart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z_$]/u.test(character);
}

function isJsxNamePart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9_$:.-]/u.test(character);
}

function skipWhitespace(source: string, offset: number): number {
  let index = offset;
  while (index < source.length && /\s/u.test(source[index] ?? "")) index += 1;
  return index;
}

function skipQuoted(source: string, offset: number): number {
  const quote = source[offset];
  if (quote !== "'" && quote !== '"') return -1;
  let index = offset + 1;
  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      index += 2;
      continue;
    }
    if (character === quote) return index + 1;
    index += 1;
  }
  return -1;
}

function skipRegexLiteral(source: string, offset: number): number {
  let index = offset + 1;
  let inClass = false;
  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      index += 2;
      continue;
    }
    if (character === "[") inClass = true;
    else if (character === "]") inClass = false;
    else if (character === "/" && !inClass) {
      index += 1;
      while (/[A-Za-z]/u.test(source[index] ?? "")) index += 1;
      return index;
    }
    index += 1;
  }
  return -1;
}

function skipTemplate(source: string, offset: number): number {
  let index = offset + 1;
  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      index += 2;
      continue;
    }
    if (character === "`") return index + 1;
    if (character === "$" && source[index + 1] === "{") {
      const expressionEnd = skipJsxExpression(source, index + 1);
      if (expressionEnd < 0) return -1;
      index = expressionEnd;
      continue;
    }
    index += 1;
  }
  return -1;
}

function isRegexStart(source: string, offset: number): boolean {
  let index = offset - 1;
  while (index >= 0 && /\s/u.test(source[index] ?? "")) index -= 1;
  if (index < 0) return true;
  return "([{,:;!?&|=+-*%^~<>".includes(source[index] ?? "");
}

/** Skips a JSX expression, including nested braces and quoted values. */
function skipJsxExpression(source: string, offset: number): number {
  if (source[offset] !== "{") return -1;
  let depth = 1;
  let index = offset + 1;
  while (index < source.length) {
    const character = source[index];
    if (character === "'" || character === '"') {
      index = skipQuoted(source, index);
      if (index < 0) return -1;
      continue;
    }
    if (character === "`") {
      index = skipTemplate(source, index);
      if (index < 0) return -1;
      continue;
    }
    if (character === "/" && source[index + 1] === "/") {
      const lineEnd = source.indexOf("\n", index + 2);
      index = lineEnd < 0 ? source.length : lineEnd + 1;
      continue;
    }
    if (character === "/" && source[index + 1] === "*") {
      const commentEnd = source.indexOf("*/", index + 2);
      index = commentEnd < 0 ? source.length : commentEnd + 2;
      continue;
    }
    if (character === "/" && isRegexStart(source, index)) {
      index = skipRegexLiteral(source, index);
      if (index < 0) return -1;
      continue;
    }
    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
    index += 1;
  }
  return -1;
}

function extractTemplateLiterals(
  source: string,
  offset: number,
  end: number,
): JsxAttributeLiteral[] {
  const literals: JsxAttributeLiteral[] = [];
  let segmentStart = offset + 1;
  let index = segmentStart;
  while (index < end) {
    const character = source[index];
    if (character === "\\") {
      index += 2;
      continue;
    }
    if (character === "`") {
      if (index > segmentStart) {
        literals.push({ start: segmentStart, value: source.slice(segmentStart, index) });
      }
      return literals;
    }
    if (character === "$" && source[index + 1] === "{") {
      if (index > segmentStart) {
        literals.push({ start: segmentStart, value: source.slice(segmentStart, index) });
      }
      const expressionEnd = skipJsxExpression(source, index + 1);
      if (expressionEnd < 0 || expressionEnd > end) return literals;
      index = expressionEnd;
      segmentStart = index;
      continue;
    }
    index += 1;
  }
  return literals;
}

function trimSourceRange(source: string, start: number, end: number): [number, number] {
  while (start < end && /\s/u.test(source[start] ?? "")) start += 1;
  while (end > start && /\s/u.test(source[end - 1] ?? "")) end -= 1;
  return [start, end];
}

function expressionTokens(source: string, start: number, end: number): SourceToken[] {
  return tokenizeSource(source.slice(start, end)).map((token) => ({
    ...token,
    end: token.end + start,
    start: token.start + start,
  }));
}

function isTopLevelToken(depth: TokenDepth | undefined): boolean {
  return depth?.brace === 0 && depth.bracket === 0 && depth.paren === 0;
}

function stripOuterParentheses(
  tokens: readonly SourceToken[],
  depths: readonly TokenDepth[],
  end: number,
): [number, number] | undefined {
  if (tokens[0]?.text !== "(" || tokens.at(-1)?.text !== ")") return undefined;
  for (let index = 1; index < tokens.length - 1; index += 1) {
    if (tokens[index]?.text === ")" && depths[index]?.paren === 1) return undefined;
  }
  return [tokens[0].end, tokens.at(-1)?.start ?? end];
}

/** Extract literals that are direct results of a JSX child or render callback. */
function extractRenderedExpressionLiterals(
  source: string,
  start: number,
  end: number,
  allowArrow: boolean,
  depth = 0,
): JsxTextRange[] {
  if (depth > 20) return [];
  [start, end] = trimSourceRange(source, start, end);
  if (start >= end) return [];

  const quotedEnd = skipQuoted(source, start);
  if (quotedEnd === end) {
    return [{ start, text: source.slice(start + 1, end - 1) }];
  }
  if (source[start] === "`") {
    const templateEnd = skipTemplate(source, start);
    if (templateEnd === end) {
      return extractTemplateLiterals(source, start, end).map((literal) => ({
        start: literal.start,
        text: literal.value,
      }));
    }
  }

  const tokens = expressionTokens(source, start, end);
  if (tokens.length === 0) return [];
  const depths = tokenDepths(tokens);
  const outer = stripOuterParentheses(tokens, depths, end);
  if (outer) {
    return extractRenderedExpressionLiterals(source, outer[0], outer[1], allowArrow, depth + 1);
  }

  const questionIndex = tokens.findIndex(
    (token, index) => token.text === "?" && isTopLevelToken(depths[index]),
  );
  const arrowIndex = tokens.findIndex(
    (token, index) => token.text === "=>" && isTopLevelToken(depths[index]),
  );
  if (arrowIndex >= 0 && (questionIndex < 0 || arrowIndex < questionIndex)) {
    if (!allowArrow) return [];
    const arrow = tokens[arrowIndex];
    return arrow ? extractRenderedExpressionLiterals(source, arrow.end, end, false, depth + 1) : [];
  }

  if (questionIndex >= 0) {
    let nestedConditionals = 0;
    let colonIndex = -1;
    for (let index = questionIndex + 1; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (!token || !isTopLevelToken(depths[index])) continue;
      if (token.text === "?") nestedConditionals += 1;
      else if (token.text === ":" && nestedConditionals > 0) nestedConditionals -= 1;
      else if (token.text === ":") {
        colonIndex = index;
        break;
      }
    }
    const question = tokens[questionIndex];
    const colon = tokens[colonIndex];
    if (question && colon) {
      return [
        ...extractRenderedExpressionLiterals(
          source,
          question.end,
          colon.start,
          allowArrow,
          depth + 1,
        ),
        ...extractRenderedExpressionLiterals(source, colon.end, end, allowArrow, depth + 1),
      ];
    }
  }

  const logicalOperators = tokens.filter(
    (token, index) => ["&&", "||", "??"].includes(token.text) && isTopLevelToken(depths[index]),
  );
  if (logicalOperators.length > 0) {
    const literals: JsxTextRange[] = [];
    let operandStart = start;
    for (const operator of logicalOperators) {
      // The left side of `&&` is only a guard: JavaScript renders the right
      // side (or nothing), so a string there cannot be the JSX result. `||`
      // and `??` may return either operand and therefore keep both sides.
      if (operator.text !== "&&") {
        literals.push(
          ...extractRenderedExpressionLiterals(
            source,
            operandStart,
            operator.start,
            allowArrow,
            depth + 1,
          ),
        );
      }
      operandStart = operator.end;
    }
    literals.push(
      ...extractRenderedExpressionLiterals(source, operandStart, end, allowArrow, depth + 1),
    );
    return literals;
  }

  return [];
}

function isRenderProp(name: string): boolean {
  return name === "children" || /^render(?:[A-Z].*)?$/u.test(name);
}

/** Extract user-visible string literals from a JSX braced attribute value. */
function extractJsxExpressionLiterals(
  source: string,
  offset: number,
): { end: number; literals: JsxAttributeLiteral[] } | undefined {
  const end = skipJsxExpression(source, offset);
  if (end < 0) return undefined;
  const literals: JsxAttributeLiteral[] = [];
  let index = offset + 1;
  while (index < end - 1) {
    const character = source[index];
    if (character === "'" || character === '"') {
      const literalEnd = skipQuoted(source, index);
      if (literalEnd < 0 || literalEnd > end) break;
      literals.push({ start: index, value: source.slice(index + 1, literalEnd - 1) });
      index = literalEnd;
      continue;
    }
    if (character === "`") {
      const templateEnd = skipTemplate(source, index);
      if (templateEnd < 0 || templateEnd > end) break;
      literals.push(...extractTemplateLiterals(source, index, templateEnd - 1));
      index = templateEnd;
      continue;
    }
    if (character === "/" && source[index + 1] === "/") {
      const lineEnd = source.indexOf("\n", index + 2);
      index = lineEnd < 0 || lineEnd >= end ? end : lineEnd + 1;
      continue;
    }
    if (character === "/" && source[index + 1] === "*") {
      const commentEnd = source.indexOf("*/", index + 2);
      index = commentEnd < 0 || commentEnd >= end ? end : commentEnd + 2;
      continue;
    }
    if (character === "/" && isRegexStart(source, index)) {
      const regexEnd = skipRegexLiteral(source, index);
      if (regexEnd < 0 || regexEnd > end) break;
      index = regexEnd;
      continue;
    }
    index += 1;
  }
  return { end, literals };
}

function parseJsxName(source: string, offset: number): { end: number; name: string } | undefined {
  if (!isJsxNameStart(source[offset])) return undefined;
  let index = offset + 1;
  while (isJsxNamePart(source[index])) index += 1;
  return { end: index, name: source.slice(offset, index) };
}

function parseJsxOpeningTag(source: string, offset: number): JsxTag | undefined {
  if (source[offset] !== "<" || source[offset + 1] === "/") return undefined;
  if (source[offset + 1] === ">") {
    return { attributes: [], end: offset + 2, name: "", selfClosing: false };
  }

  const parsedName = parseJsxName(source, offset + 1);
  if (!parsedName) return undefined;
  const attributes: JsxAttribute[] = [];
  let index = parsedName.end;
  while (index < source.length) {
    index = skipWhitespace(source, index);
    if (source.startsWith("/>", index)) {
      return { attributes, end: index + 2, name: parsedName.name, selfClosing: true };
    }
    if (source[index] === ">") {
      return { attributes, end: index + 1, name: parsedName.name, selfClosing: false };
    }
    if (source[index] === "{") {
      index = skipJsxExpression(source, index);
      if (index < 0) return undefined;
      continue;
    }

    const attributeStart = index;
    if (!/^[A-Za-z_:]/u.test(source[index] ?? "")) return undefined;
    index += 1;
    while (index < source.length && /[A-Za-z0-9_:.-]/u.test(source[index] ?? "")) index += 1;
    const attributeName = source.slice(attributeStart, index);
    index = skipWhitespace(source, index);
    if (source[index] !== "=") continue;
    index = skipWhitespace(source, index + 1);
    if (source[index] === "'" || source[index] === '"') {
      const quoteStart = index;
      index = skipQuoted(source, index);
      if (index >= 0) {
        attributes.push({
          name: attributeName,
          literals: [
            {
              start: quoteStart,
              value: source.slice(quoteStart + 1, index - 1),
            },
          ],
          renderedText: [],
        });
      }
    } else if (source[index] === "{") {
      const expressionStart = index;
      const expression = extractJsxExpressionLiterals(source, index);
      if (!expression) return undefined;
      attributes.push({
        name: attributeName,
        literals: expression.literals,
        renderedText: isRenderProp(attributeName)
          ? extractRenderedExpressionLiterals(source, expressionStart + 1, expression.end - 1, true)
          : [],
      });
      index = expression.end;
    } else {
      // JSX attributes must use a quoted string or a braced expression. A
      // bare value here is a useful signal that this was a comparison or a
      // generic type expression rather than an opening element.
      return undefined;
    }
    if (index < 0) return undefined;
    if (index === attributeStart) return undefined;
  }
  return undefined;
}

function parseJsxClosingTag(source: string, offset: number): JsxTag | undefined {
  if (!source.startsWith("</", offset)) return undefined;
  if (source[offset + 2] === ">") {
    return { attributes: [], end: offset + 3, name: "", selfClosing: false };
  }
  const parsedName = parseJsxName(source, offset + 2);
  if (!parsedName) return undefined;
  const end = skipWhitespace(source, parsedName.end);
  if (source[end] !== ">") return undefined;
  return { attributes: [], end: end + 1, name: parsedName.name, selfClosing: false };
}

function parseJsxElement(source: string, offset: number, depth = 0): JsxElement | undefined {
  // A malformed source file should not make the checker recurse indefinitely.
  if (depth > 100) return undefined;
  const opening = parseJsxOpeningTag(source, offset);
  if (!opening) return undefined;
  const text = opening.attributes.flatMap((attribute) => attribute.renderedText);
  if (opening.selfClosing) return { end: opening.end, text };

  let index = opening.end;
  while (index < source.length) {
    if (source[index] === "{") {
      const expressionEnd = skipJsxExpression(source, index);
      if (expressionEnd < 0) return undefined;
      text.push(...extractRenderedExpressionLiterals(source, index + 1, expressionEnd - 1, false));
      index = expressionEnd;
      continue;
    }
    if (source[index] === "<") {
      const closing = parseJsxClosingTag(source, index);
      if (closing) {
        if (closing.name !== opening.name) return undefined;
        return { end: closing.end, text };
      }
      const child = parseJsxElement(source, index, depth + 1);
      if (!child) return undefined;
      text.push(...child.text);
      index = child.end;
      continue;
    }

    const textStart = index;
    while (index < source.length && source[index] !== "<" && source[index] !== "{") index += 1;
    const value = source.slice(textStart, index);
    if (isLikelyJsxText(value)) text.push({ start: textStart, text: value });
  }
  return undefined;
}

function previousSignificantOffset(source: string, offset: number): number {
  let index = offset - 1;
  while (index >= 0) {
    while (index >= 0 && /\s/u.test(source[index] ?? "")) index -= 1;
    if (index < 1) return index;
    if (source[index - 1] === "*" && source[index] === "/") {
      const commentStart = source.lastIndexOf("/*", index - 2);
      index = commentStart - 1;
      continue;
    }
    const lineStart = source.lastIndexOf("\n", index) + 1;
    const lineComment = source.lastIndexOf("//", index);
    if (lineComment >= lineStart) {
      index = lineComment - 1;
      continue;
    }
    return index;
  }
  return index;
}

function isPossibleJsxStart(source: string, offset: number): boolean {
  const previous = previousSignificantOffset(source, offset);
  if (previous < 0) return true;
  const character = source[previous];
  if (character && "=([{,:;!?&|+-*%^~>".includes(character)) return true;

  let wordStart = previous;
  while (wordStart >= 0 && /[A-Za-z0-9_$]/u.test(source[wordStart] ?? "")) wordStart -= 1;
  const word = source.slice(wordStart + 1, previous + 1);
  return new Set(["await", "case", "default", "do", "else", "return", "throw", "yield"]).has(word);
}

function findJsxText(source: SourceInput): I18nFinding[] {
  const findings: I18nFinding[] = [];
  const reportedOffsets = new Set<number>();
  for (const token of tokenizeSource(source.content)) {
    if (token.kind !== SyntaxKind.LessThanToken) continue;
    if (!isPossibleJsxStart(source.content, token.start)) continue;
    const element = parseJsxElement(source.content, token.start);
    if (!element) continue;
    for (const item of element.text) {
      if (reportedOffsets.has(item.start) || !isLikelyJsxText(item.text)) continue;
      reportedOffsets.add(item.start);
      findings.push(
        sourceOffsetFinding(
          source,
          "source.hardcoded",
          item.start,
          `JSX contains hardcoded user-facing text: ${item.text.replace(/\s+/g, " ").trim()}`,
          "move the text into the owning en/zh catalog and render it through the typed translator",
        ),
      );
    }
  }
  return findings;
}

/**
 * Finds literal values in JSX attributes directly from the source text. The
 * TypeScript scanner can treat a template-literal className expression as one
 * token and then skip following JSX tokens, so this small parser keeps
 * accessibility attributes covered independently of scanner recovery.
 */
function findJsxAttributes(source: SourceInput): I18nFinding[] {
  const findings: I18nFinding[] = [];
  const reportedOffsets = new Set<number>();
  for (let offset = 0; offset < source.content.length; offset += 1) {
    if (source.content[offset] !== "<" || !isPossibleJsxStart(source.content, offset)) continue;
    const opening = parseJsxOpeningTag(source.content, offset);
    if (!opening) continue;
    for (const attribute of opening.attributes) {
      if (!uiAttributeNames.has(attribute.name.toLowerCase())) continue;
      for (const literal of attribute.literals) {
        if (
          reportedOffsets.has(literal.start) ||
          isLikelyTranslationKey(literal.value) ||
          !isLikelyHumanText(literal.value, true)
        )
          continue;
        reportedOffsets.add(literal.start);
        findings.push(
          sourceOffsetFinding(
            source,
            "source.hardcoded",
            literal.start,
            `JSX attribute ${attribute.name} contains hardcoded user-facing text`,
            "use a typed translation key for this attribute",
          ),
        );
      }
    }
  }
  return findings;
}

function findDirectFacadeImports(source: SourceInput): I18nFinding[] {
  if (sourceFacadeAllowlist.has(source.location) || sourceRecoveryAllowlist.has(source.location)) {
    return [];
  }
  const findings: I18nFinding[] = [];
  const importPattern =
    /import\s+(?:type\s+)?(?:\{([\s\S]*?)\}|[^;]*?)\s+from\s+["']@voidmix\/i18n\/client["']/gu;
  for (const match of source.content.matchAll(importPattern)) {
    const specifiers = match[1] ?? match[0];
    if (!/\buseTranslations\b/u.test(specifiers)) continue;
    const offset = match.index + match[0].indexOf("useTranslations");
    findings.push(
      sourceOffsetFinding(
        source,
        "source.facade",
        offset,
        "imports useTranslations directly from @voidmix/i18n/client",
        "import the surface-local typed translation facade instead",
      ),
    );
  }
  for (const match of source.content.matchAll(/from\s+["']use-intl(?:\/[^"']+)?["']/gu)) {
    findings.push(
      sourceOffsetFinding(
        source,
        "source.facade",
        match.index,
        "imports the use-intl implementation directly",
        "keep use-intl behind @voidmix/i18n",
      ),
    );
  }
  return findings;
}

function findHardcodedLiterals(source: SourceInput): I18nFinding[] {
  const tokens = tokenizeSource(source.content);
  const depths = tokenDepths(tokens);
  const findings: I18nFinding[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) continue;
    if (
      token.kind !== SyntaxKind.StringLiteral &&
      token.kind !== SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      continue;
    }
    const value = token.value;
    if (!value || !/[A-Za-z\u00c0-\u024f\u4e00-\u9fff]/u.test(value)) continue;
    if (isTranslationCall(tokens, index)) continue;

    const attribute = jsxAttributeBefore(source.content, token.start);
    if (attribute && uiAttributeNames.has(attribute.toLowerCase())) {
      if (!isLikelyHumanText(value, true)) continue;
      findings.push(
        sourceOffsetFinding(
          source,
          "source.hardcoded",
          token.start,
          `JSX attribute ${attribute} contains hardcoded user-facing text`,
          "use a typed translation key for this attribute",
        ),
      );
      continue;
    }

    const directProperty = propertyNameBefore(tokens, index);
    // Scanner template chunks can span JSX markup and subsequent expressions;
    // only ordinary string tokens have a reliable conditional-property range.
    const property =
      directProperty ??
      (token.kind === SyntaxKind.StringLiteral
        ? conditionalObjectPropertyBefore(tokens, depths, index)
        : undefined);
    const isUiProperty = directProperty
      ? uiPropertyNames.has(directProperty)
      : property !== undefined && conditionalUiPropertyNames.has(property);
    if (property && isUiProperty) {
      if (
        isStructuredDataSource(source.location) ||
        hasTranslationSibling(source.content, token.start, property) ||
        isLikelyTranslationKey(value) ||
        !isLikelyHumanText(value, true)
      ) {
        continue;
      }
      findings.push(
        sourceOffsetFinding(
          source,
          "source.hardcoded",
          token.start,
          `UI property ${property} contains hardcoded user-facing text`,
          "store the display value as a locale key and translate it at the render boundary",
        ),
      );
      continue;
    }

    const variable =
      token.kind === SyntaxKind.StringLiteral
        ? conditionalUiVariableBefore(tokens, depths, index)
        : undefined;
    if (variable) {
      if (isLikelyTranslationKey(value) || !isLikelyHumanText(value, true)) continue;
      findings.push(
        sourceOffsetFinding(
          source,
          "source.hardcoded",
          token.start,
          `UI variable ${variable} contains hardcoded user-facing text`,
          "store the value in the owning catalog and resolve it through the typed translator",
        ),
      );
      continue;
    }

    const callName = callNameBefore(tokens, index);
    if (callName === "Error" || callName === "setError") {
      if (isOperationalSource(source.location) || !isLikelyHumanText(value, true)) continue;
      findings.push(
        sourceOffsetFinding(
          source,
          "source.hardcoded",
          token.start,
          `raw ${callName} message can bypass the error translation map`,
          "return a stable error code and translate it at the UI boundary",
        ),
      );
      continue;
    }

    if (/^(?:en|zh|en-[A-Z]{2}|zh-[A-Z]{2})$/u.test(value) && isInFormattingCall(tokens, index)) {
      findings.push(
        sourceOffsetFinding(
          source,
          "source.locale",
          token.start,
          `formatting call hardcodes locale ${value}`,
          "pass the active locale to the shared formatter",
        ),
      );
      continue;
    }
  }
  return findings;
}

/** Checks one source file for facade violations and likely user-facing literals. */
export function checkSourceFile(source: SourceInput): I18nFinding[] {
  if (source.location.endsWith(".d.ts") || /(?:^|\/)routeTree\.gen\.ts$/u.test(source.location)) {
    return [];
  }
  if (/(?:\.test|\.spec)\.[jt]sx?$/u.test(source.location) || /\/tests?\//u.test(source.location)) {
    return [];
  }
  if (sourceRecoveryAllowlist.has(source.location)) return [];
  const findings = [...findDirectFacadeImports(source), ...findHardcodedLiterals(source)];
  if (!source.location.endsWith(".tsx")) return findings;
  findings.push(...findJsxText(source), ...findJsxAttributes(source));
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = `${item.check}:${item.line}:${item.column}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createI18nReport(findings: I18nFinding[]): I18nReport {
  const sorted = [...findings].sort((left, right) => {
    const location = left.location.localeCompare(right.location);
    if (location !== 0) return location;
    if (left.line !== right.line) return left.line - right.line;
    if (left.column !== right.column) return left.column - right.column;
    return left.message.localeCompare(right.message);
  });
  return {
    errors: sorted.filter((item) => item.severity === "error").length,
    findings: sorted,
    warnings: sorted.filter((item) => item.severity === "warn").length,
  };
}

/** Runs catalog parity and source checks over injected repository content. */
export function runI18nChecks(
  catalogs: readonly CatalogInput[],
  sources: readonly SourceInput[],
): I18nReport {
  const findings: I18nFinding[] = [];
  const bySurface = new Map<string, Map<SupportedLocale, CatalogInput>>();
  for (const catalog of catalogs) {
    const surface = bySurface.get(catalog.surface) ?? new Map<SupportedLocale, CatalogInput>();
    if (surface.has(catalog.locale)) {
      findings.push(
        finding(
          "catalog.parse",
          catalog.location,
          `duplicate ${catalog.locale} catalog for ${catalog.surface}`,
          "keep one messages/<locale>.json file per surface and locale",
        ),
      );
    }
    surface.set(catalog.locale, catalog);
    bySurface.set(catalog.surface, surface);
  }

  for (const [surface, locales] of bySurface) {
    const left = locales.get("en");
    const right = locales.get("zh");
    if (!left || !right) {
      const missing = left ? "zh" : "en";
      findings.push(
        finding(
          "catalog.parity",
          left?.location ?? right?.location ?? `messages/${missing}.json`,
          `${surface} is missing its ${missing} catalog`,
          `add ${surface}/messages/${missing}.json`,
        ),
      );
    } else {
      findings.push(...checkCatalogPair(left, right));
    }
  }

  for (const source of sources) findings.push(...checkSourceFile(source));
  return createI18nReport(findings);
}
