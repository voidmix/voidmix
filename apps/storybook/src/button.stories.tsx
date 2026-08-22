import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@voidmix/ui";

const meta = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    children: "Continue",
    variant: "primary",
    size: "medium",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    children: "Review details",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete account",
    variant: "danger",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="small">Small</Button>
      <Button size="medium">Medium</Button>
      <Button size="large">Large</Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    children: "Unavailable",
    disabled: true,
  },
};
