export interface ChatSkill {
  readonly description: string;
  readonly name: string;
}

export const chatSkills: readonly ChatSkill[] = [
  { name: "summarize", description: "Condense the thread into key points." },
  { name: "brainstorm", description: "Generate options for the current problem." },
  { name: "explain", description: "Walk through how something works." },
  { name: "review", description: "Critique the current draft or change." },
];

export interface SlashToken {
  /** End of the replaced range: the caret plus any word characters still to its right. */
  readonly end: number;
  /** Lowercased text between the slash and the caret. */
  readonly query: string;
  /** Index of the slash itself. */
  readonly start: number;
}

/**
 * A slash only opens a token at the start of the draft or after whitespace, so
 * `http://example` and `a/b` never match.
 */
const slashToken = /(^|\s)\/([\w-]*)$/;
const leadingWord = /^[\w-]*/;
const leadingBlank = /^[ \t]+/;

export function findSlashToken(value: string, caret: number): SlashToken | null {
  const match = slashToken.exec(value.slice(0, caret));
  if (!match) return null;

  const [, leading = "", query = ""] = match;
  const trailing = leadingWord.exec(value.slice(caret))?.[0] ?? "";

  return {
    start: match.index + leading.length,
    end: caret + trailing.length,
    query: query.toLowerCase(),
  };
}

export function matchSkills(
  query: string,
  skills: readonly ChatSkill[] = chatSkills,
): readonly ChatSkill[] {
  const needle = query.toLowerCase();
  if (!needle) return skills;
  return skills.filter((skill) => skill.name.toLowerCase().startsWith(needle));
}

export interface DraftEdit {
  readonly caret: number;
  readonly value: string;
}

export function applySkill(value: string, token: SlashToken, skill: ChatSkill): DraftEdit {
  const before = value.slice(0, token.start);
  const after = value.slice(token.end).replace(leadingBlank, "");
  // A caret insertion can land against a word, and a slash glued to one would
  // not parse back into a token.
  const separator = before && !/\s$/.test(before) ? " " : "";
  const inserted = `/${skill.name} `;

  return {
    value: `${before}${separator}${inserted}${after}`,
    caret: before.length + separator.length + inserted.length,
  };
}

/** Entry point for the attachment menu, where the caret carries no token. */
export function insertSkillAtCaret(value: string, caret: number, skill: ChatSkill): DraftEdit {
  const token = findSlashToken(value, caret) ?? { start: caret, end: caret, query: "" };
  return applySkill(value, token, skill);
}
