import type { Meta, StoryObj } from "@storybook/react-vite";
import { BrandMark } from "@voidmix/ui";

const meta = {
  title: "Primitives/BrandMark",
  component: BrandMark,
  tags: ["autodocs"],
  args: {
    label: "Voidmix",
  },
} satisfies Meta<typeof BrandMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabel: Story = {
  args: {
    label: "Voidmix Admin",
  },
};
