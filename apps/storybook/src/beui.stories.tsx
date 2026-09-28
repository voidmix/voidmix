import type { Meta, StoryObj } from "@storybook/react-vite";
import { BeuiButton } from "@voidmix/ui/beui-button";
import { BeuiBadge } from "@voidmix/ui/beui-badge";
import { BeuiSidebar } from "@voidmix/ui/beui-sidebar";
import { BeuiSidebarNavigation, BeuiSidebarItem } from "@voidmix/ui/beui-sidebar-navigation";

const meta = {
  title: "beUI/Primitives",
  component: BeuiButton,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="beui-theme bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BeuiButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Actions: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <BeuiButton>Create project</BeuiButton>
      <BeuiButton variant="outline">Next page</BeuiButton>
      <BeuiButton variant="ghost">Cancel</BeuiButton>
      <BeuiButton disabled>Saving…</BeuiButton>
    </div>
  ),
};
export const Statuses: Story = {
  render: () => (
    <div className="flex gap-3">
      <BeuiBadge>Draft</BeuiBadge>
      <BeuiBadge tone="info">In progress</BeuiBadge>
      <BeuiBadge tone="warning">In review</BeuiBadge>
      <BeuiBadge tone="success">Delivered</BeuiBadge>
    </div>
  ),
};
export const Navigation: Story = {
  render: () => (
    <BeuiSidebar className="relative h-auto w-58 border p-4">
      <BeuiSidebarNavigation label="Example navigation">
        <BeuiSidebarItem id="projects" active>
          <a className="relative block rounded-lg px-3 py-2" href="#projects" aria-current="page">
            Projects
          </a>
        </BeuiSidebarItem>
        <BeuiSidebarItem id="users" active={false}>
          <a className="relative block rounded-lg px-3 py-2" href="#users">
            User management
          </a>
        </BeuiSidebarItem>
      </BeuiSidebarNavigation>
    </BeuiSidebar>
  ),
};
