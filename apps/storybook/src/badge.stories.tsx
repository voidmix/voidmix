import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@voidmix/ui";

const meta = {
  title: "Primitives/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: {
    children: "Active",
    tone: "positive",
    withDot: true,
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Positive: Story = {};

export const Warning: Story = {
  args: {
    children: "Needs review",
    tone: "warning",
  },
};

export const Neutral: Story = {
  args: {
    children: "Draft",
    tone: "neutral",
    withDot: false,
  },
};

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="neutral" withDot>
        Neutral
      </Badge>
      <Badge tone="positive" withDot>
        Positive
      </Badge>
      <Badge tone="warning" withDot>
        Warning
      </Badge>
      <Badge tone="accent" withDot>
        Accent
      </Badge>
    </div>
  ),
};
