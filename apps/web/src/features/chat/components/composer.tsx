import { Sparkle } from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";
import { useState, type FormEvent } from "react";

interface ComposerProps {
  onSubmit: (prompt: string) => void;
  value?: string;
}

export function Composer({ onSubmit, value = "" }: ComposerProps) {
  const [prompt, setPrompt] = useState(value);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    onSubmit(trimmedPrompt);
    setPrompt("");
  }

  return (
    <form
      className="rounded-xl border border-input bg-card p-2.5 transition-[border-color,box-shadow] focus-within:border-ring/70 focus-within:ring-2 focus-within:ring-ring/20"
      onSubmit={handleSubmit}
    >
      <div className="flex items-start gap-2.5">
        <Sparkle aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
        <textarea
          aria-label="Ask Voidmix"
          className="min-h-[2.9rem] min-w-0 flex-1 resize-y border-0 bg-transparent p-0 text-[0.82rem] leading-[1.5] text-foreground outline-none placeholder:text-muted-foreground"
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask about this workspace"
          rows={2}
          value={prompt}
        />
      </div>
      <div className="mt-2.5 flex items-center justify-end gap-2 border-t border-border pt-2">
        <Button
          aria-label="Send message"
          disabled={!prompt.trim()}
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
