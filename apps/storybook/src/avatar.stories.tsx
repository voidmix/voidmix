import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "@voidmix/ui";

const meta = {
  title: "Primitives/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: {
    name: "Ada Lovelace",
    size: "medium",
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fallback: Story = {};

export const Small: Story = {
  args: {
    name: "Grace Hopper",
    size: "small",
  },
};

export const Large: Story = {
  args: {
    name: "Katherine Johnson",
    size: "large",
  },
};
