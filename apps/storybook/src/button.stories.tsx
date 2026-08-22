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
