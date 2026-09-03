import { Plus, Sparkle } from "@phosphor-icons/react";
import { useTranslations } from "@voidmix/i18n/client";
import { Button } from "@voidmix/ui/components/ui/button";
import { cn } from "@voidmix/ui/lib/utils";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  chatSkills,
  findSlashToken,
  insertSkillAtCaret,
  matchSkills,
  type ChatSkill,
} from "../skills";
import { SkillMenu } from "./skill-menu";
import { loadAttachmentMenu } from "./attachment-menu-lazy";

interface ComposerProps {
  disabled?: boolean;
  focusKey?: number;
  onSubmit: (prompt: string) => void;
  onValueChange?: (value: string) => void;
  value?: string;
  variant?: "launcher" | "conversation";
}

export function Composer({
  disabled = false,
  focusKey = 0,
  onSubmit,
  onValueChange,
  value,
  variant = "conversation",
}: ComposerProps) {
  const t = useTranslations("home");
  const [internalPrompt, setInternalPrompt] = useState(value ?? "");
  const isControlled = value !== undefined;
  const prompt = isControlled ? value : internalPrompt;
  const [caret, setCaret] = useState(prompt.length);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachmentMenu, setAttachmentMenu] = useState<
    typeof import("./attachment-menu").AttachmentMenu | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCaretRef = useRef<number | null>(null);

  const baseId = useId();
  const listboxId = `${baseId}-skills`;
  const optionId = (index: number) => `${baseId}-skill-${index}`;

  const localizedSkills = chatSkills.map((skill) => ({
    ...skill,
    description: skill.descriptionKey ? t(skill.descriptionKey) : skill.description,
  }));
  const token = dismissed ? null : findSlashToken(prompt, caret);
  const suggestions = token ? matchSkills(token.query, localizedSkills) : [];
  const isMenuOpen = focused && suggestions.length > 0;
  // Clamping during render means a shrinking filter can never expose a stale index.
  const boundedIndex = Math.min(activeIndex, suggestions.length - 1);

  // A controlled textarea keeps its old caret when the value grows, so the caret
  // has to be restored after React commits the inserted text.
  useLayoutEffect(() => {
    const target = pendingCaretRef.current;
    if (target === null) return;
    pendingCaretRef.current = null;

    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(target, target);
  }, [prompt]);

  useLayoutEffect(() => {
    if (!focusKey) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(prompt.length, prompt.length);
    setCaret(prompt.length);
    setFocused(true);
  }, [focusKey]);

  function updatePrompt(next: string) {
    if (!isControlled) setInternalPrompt(next);
    onValueChange?.(next);
  }

  function resetDraft(next: string) {
    updatePrompt(next);
    setCaret(next.length);
    setActiveIndex(0);
    setDismissed(false);
  }

  function submitDraft() {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    onSubmit(trimmedPrompt);
    resetDraft("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitDraft();
  }

  function appendAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const next = `${prompt}${prompt ? "\n" : ""}[attachment: ${file.name}]`;
      updatePrompt(next);
    }
    event.target.value = "";
  }

  function selectSkill(skill: ChatSkill | undefined) {
    if (!skill) return;
    const edit = insertSkillAtCaret(prompt, caret, skill);
    pendingCaretRef.current = edit.caret;
    updatePrompt(edit.value);
    setCaret(edit.caret);
    setActiveIndex(0);
    setDismissed(false);
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    updatePrompt(event.target.value);
    setCaret(event.target.selectionStart);
    setActiveIndex(0);
    // Any edit revives a menu that Escape dismissed.
    setDismissed(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // An IME commit arrives as Enter; it must neither send nor pick a skill.
    if (event.nativeEvent.isComposing) return;

    if (isMenuOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : suggestions.length - 1;
        setActiveIndex((boundedIndex + step) % suggestions.length);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setDismissed(true);
        return;
      }
      if (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey)) {
        event.preventDefault();
        selectSkill(suggestions[boundedIndex]);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitDraft();
    }
  }

  function prefetchAttachmentMenu() {
    void loadAttachmentMenu()
      .then((module) => setAttachmentMenu(() => module.AttachmentMenu))
      .catch(() => undefined);
  }

  function openAttachmentMenu() {
    setAttachmentMenuOpen(true);
    void loadAttachmentMenu()
      .then((module) => setAttachmentMenu(() => module.AttachmentMenu))
      .catch(() => setAttachmentMenuOpen(false));
  }

  const attachmentTrigger = (onClick?: () => void) => (
    <Button
      aria-label={t("addAttachmentOrSkill")}
      aria-expanded={attachmentMenuOpen}
      aria-haspopup="menu"
      disabled={disabled}
      onClick={onClick}
      onFocus={prefetchAttachmentMenu}
      onPointerDown={prefetchAttachmentMenu}
      size="icon"
      variant="ghost"
    >
      <Plus aria-hidden="true" weight="bold" />
    </Button>
  );
  const AttachmentMenu = attachmentMenu;

  return (
    <form
      aria-busy={disabled}
      className={cn(
        "relative border border-input bg-card transition-[border-color,box-shadow] focus-within:border-ring/70 focus-within:ring-2 focus-within:ring-ring/20",
        variant === "launcher" ? "rounded-lg p-3" : "rounded-xl p-2.5",
      )}
      onSubmit={handleSubmit}
    >
      {isMenuOpen ? (
        <SkillMenu
          activeIndex={boundedIndex}
          listboxId={listboxId}
          onActivate={setActiveIndex}
          onSelect={selectSkill}
          optionId={optionId}
          skills={suggestions}
        />
      ) : null}
      <span className="sr-only" role="status">
        {isMenuOpen ? t("skillSuggestions", { count: suggestions.length }) : ""}
      </span>
      <div className="flex items-start gap-2.5">
        <Sparkle aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
        <textarea
          aria-activedescendant={isMenuOpen ? optionId(boundedIndex) : undefined}
          aria-autocomplete="list"
          aria-controls={isMenuOpen ? listboxId : undefined}
          aria-label={t("askVoidmix")}
          aria-owns={isMenuOpen ? listboxId : undefined}
          autoComplete="off"
          className={cn(
            "min-w-0 flex-1 resize-y border-0 bg-transparent p-0 text-[0.82rem] leading-[1.5] text-foreground outline-none placeholder:text-muted-foreground",
            variant === "launcher" ? "min-h-[4.5rem]" : "min-h-[6rem]",
          )}
          disabled={disabled}
          onBlur={() => setFocused(false)}
          onChange={handleChange}
          onClick={(event) => setCaret(event.currentTarget.selectionStart)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          onKeyUp={(event) => setCaret(event.currentTarget.selectionStart)}
          name="prompt"
          placeholder={t("askWorkspace")}
          ref={textareaRef}
          rows={variant === "launcher" ? 3 : 4}
          value={prompt}
        />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2">
        {AttachmentMenu ? (
          <AttachmentMenu
            fileInputRef={fileInputRef}
            onOpenChange={setAttachmentMenuOpen}
            onSelectSkill={selectSkill}
            open={attachmentMenuOpen}
            skills={localizedSkills}
            skillsLabel={t("skills")}
            title={t("addToMessage")}
            trigger={attachmentTrigger()}
            uploadFile={t("uploadFile")}
          />
        ) : (
          attachmentTrigger(openAttachmentMenu)
        )}
        <input
          aria-hidden="true"
          className="sr-only"
          onChange={appendAttachment}
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />
        <Button
          aria-label={t("sendMessage")}
          disabled={disabled || !prompt.trim()}
          size="icon"
          type="submit"
          variant="primary"
        >
          <Sparkle aria-hidden="true" weight="fill" />
        </Button>
      </div>
    </form>
  );
}
