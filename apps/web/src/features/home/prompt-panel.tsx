import { ArrowRight, ChatCircleDots } from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";

export function PromptPanel() {
  return (
    <div className="prompt-panel">
      <div className="prompt-panel__input">
        <ChatCircleDots aria-hidden="true" />
        <textarea
          aria-label="Ask Voidmix"
          placeholder="Ask Voidmix anything about this workspace"
          rows={2}
        />
      </div>
      <div className="prompt-panel__footer">
        <span>Use ⌘ K to search everything</span>
        <Button aria-label="Send question" className="send-button" size="icon" variant="primary">
          <ArrowRight aria-hidden="true" weight="bold" />
        </Button>
      </div>
    </div>
  );
}
