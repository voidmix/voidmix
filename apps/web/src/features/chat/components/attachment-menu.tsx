import { Paperclip, Wrench } from "@phosphor-icons/react";
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
import type { RefObject, ReactElement } from "react";

import type { ChatSkill } from "../skills";

export interface AttachmentMenuProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onOpenChange: (open: boolean) => void;
  onSelectSkill: (skill: ChatSkill) => void;
  open: boolean;
  skills: readonly ChatSkill[];
  title: string;
  trigger: ReactElement;
  uploadFile: string;
  skillsLabel: string;
}

export function AttachmentMenu({
  fileInputRef,
  onOpenChange,
  onSelectSkill,
  open,
  skills,
  title,
  trigger,
  uploadFile,
  skillsLabel,
}: AttachmentMenuProps) {
  return (
    <DropdownMenu onOpenChange={onOpenChange} open={open}>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="start" side="top" sideOffset={4}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{title}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Paperclip aria-hidden="true" />
            {uploadFile}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Wrench aria-hidden="true" />
            {skillsLabel}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {skills.map((skill) => (
              <DropdownMenuItem key={skill.name} onClick={() => onSelectSkill(skill)}>
                /{skill.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
