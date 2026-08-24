import { describe, expect, it } from "vite-plus/test";

import {
  applySkill,
  findSlashToken,
  insertSkillAtCaret,
  matchSkills,
  type ChatSkill,
  type SlashToken,
} from "./skills";

function tokenAt(value: string, caret: number): SlashToken {
  const token = findSlashToken(value, caret);
  if (!token) throw new Error(`expected a slash token in ${JSON.stringify(value)} at ${caret}`);
  return token;
}

const catalog: readonly ChatSkill[] = [
  { name: "summarize", description: "one" },
  { name: "sweep", description: "two" },
  { name: "review", description: "three" },
];

const summarize: ChatSkill = { name: "summarize", description: "one" };

describe("slash token parsing", () => {
  it("finds a token at the start of the draft", () => {
    expect(findSlashToken("/sum", 4)).toEqual({ start: 0, end: 4, query: "sum" });
  });

  it("finds a token after a space", () => {
    expect(findSlashToken("hello /sum", 10)).toEqual({ start: 6, end: 10, query: "sum" });
  });

  it("finds a token after a newline", () => {
    expect(findSlashToken("hello\n/sum", 10)).toEqual({ start: 6, end: 10, query: "sum" });
  });

  it("treats a bare slash as an empty query", () => {
    expect(findSlashToken("/", 1)).toEqual({ start: 0, end: 1, query: "" });
  });

  it("ignores a slash inside a word", () => {
    expect(findSlashToken("http://example", 14)).toBeNull();
    expect(findSlashToken("a/b", 3)).toBeNull();
  });

  it("ignores a slash to the right of the caret", () => {
    expect(findSlashToken("hi /sum", 2)).toBeNull();
  });

  it("stops the query at the caret rather than the end of the draft", () => {
    expect(findSlashToken("/summarize", 4)).toMatchObject({ query: "sum" });
  });

  it("extends the replaced range over the word after the caret", () => {
    expect(findSlashToken("/summarize", 4)).toEqual({ start: 0, end: 10, query: "sum" });
  });

  it("returns null for a draft with no slash", () => {
    expect(findSlashToken("summarize this", 14)).toBeNull();
  });

  it("lowercases the query", () => {
    expect(findSlashToken("/SUM", 4)).toMatchObject({ query: "sum" });
  });
});

describe("skill matching", () => {
  it("returns every skill for an empty query", () => {
    expect(matchSkills("", catalog)).toEqual(catalog);
  });

  it("filters by name prefix", () => {
    expect(matchSkills("su", catalog).map((skill) => skill.name)).toEqual(["summarize"]);
    expect(matchSkills("s", catalog).map((skill) => skill.name)).toEqual(["summarize", "sweep"]);
  });

  it("filters case-insensitively", () => {
    expect(matchSkills("SU", catalog).map((skill) => skill.name)).toEqual(["summarize"]);
  });

  it("returns nothing for an unmatched query", () => {
    expect(matchSkills("zzz", catalog)).toEqual([]);
  });

  it("falls back to the shipped catalog when none is supplied", () => {
    expect(matchSkills("summ").map((skill) => skill.name)).toEqual(["summarize"]);
  });
});

describe("applying a skill to a draft", () => {
  it("replaces the token and leaves the surrounding text intact", () => {
    const draft = "tell me /sum about it";
    expect(applySkill(draft, tokenAt(draft, 12), summarize).value).toBe(
      "tell me /summarize about it",
    );
  });

  it("places the caret after the inserted skill and its single space", () => {
    expect(applySkill("/sum", { start: 0, end: 4, query: "sum" }, summarize).caret).toBe(11);
  });

  it("collapses whitespace that already followed the token", () => {
    expect(applySkill("/sum    rest", { start: 0, end: 4, query: "sum" }, summarize).value).toBe(
      "/summarize rest",
    );
  });

  it("replaces a word the caret sits inside instead of duplicating it", () => {
    expect(applySkill("/summarize", tokenAt("/summarize", 4), summarize).value).toBe("/summarize ");
  });
});

describe("inserting a skill at the caret", () => {
  it("inserts at the caret when no token is present", () => {
    expect(insertSkillAtCaret("", 0, summarize)).toEqual({ value: "/summarize ", caret: 11 });
  });

  it("keeps the slash separated from preceding text", () => {
    expect(insertSkillAtCaret("hello", 5, summarize).value).toBe("hello /summarize ");
  });

  it("does not add a second space after existing whitespace", () => {
    expect(insertSkillAtCaret("hello ", 6, summarize).value).toBe("hello /summarize ");
  });

  it("reuses an existing token under the caret", () => {
    expect(insertSkillAtCaret("/sum", 4, summarize).value).toBe("/summarize ");
  });

  it("inserts mid-draft without moving the trailing text", () => {
    expect(insertSkillAtCaret("a b", 1, summarize).value).toBe("a /summarize b");
  });
});
