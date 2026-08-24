import { Paperclip, Plus, Sparkle, Wrench } from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@voidmix/ui/components/ui/dropdown-menu";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

interface ComposerProps {
  onSubmit: (prompt: string) => void;
  value?: string;
}

const skills = ["summarize", "brainstorm", "explain", "review"] as const;

export function Composer({ onSubmit, value = "" }: ComposerProps) {
  const [prompt, setPrompt] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    onSubmit(trimmedPrompt);
    setPrompt("");
  }

  function appendAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setPrompt((current) => `${current}${current ? "\n" : ""}[attachment: ${file.name}]`);
    }
    event.target.value = "";
  }

  function insertSkill(skill: string) {
    setPrompt((current) => {
      const stripped = current.replace(/^\/\S+\s/, "").trimStart();
      return `/${skill} ${stripped}`;
    });
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
          className="min-h-[6rem] min-w-0 flex-1 resize-y border-0 bg-transparent p-0 text-[0.82rem] leading-[1.5] text-foreground outline-none placeholder:text-muted-foreground"
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask about this workspace"
          rows={4}
          value={prompt}
        />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button aria-label="Add attachment or skill" size="icon" variant="ghost">
                <Plus aria-hidden="true" weight="bold" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" side="top" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Add to message</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Paperclip aria-hidden="true" />
                Upload file
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Wrench aria-hidden="true" />
                Skills
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {skills.map((skill) => (
                  <DropdownMenuItem
                    key={skill}
                    onClick={() => {
                      insertSkill(skill);
                    }}
                  >
                    /{skill}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          aria-hidden="true"
          className="sr-only"
          onChange={appendAttachment}
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />
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
