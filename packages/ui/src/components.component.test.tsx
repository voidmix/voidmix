/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { Avatar } from "./avatar";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Separator } from "./components/ui/separator";

afterEach(() => cleanup());

describe("Button", () => {
  it("renders an accessible button with its default type", () => {
    render(<Button>Save changes</Button>);

    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("group/button");
  });

  it("supports keyboard focus and disabled state", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Button>Continue</Button>
        <Button disabled>Unavailable</Button>
      </>,
    );

    const enabled = screen.getByRole("button", { name: "Continue" });
    await user.tab();
    expect(enabled).toHaveFocus();
    expect(screen.getByRole("button", { name: "Unavailable" })).toBeDisabled();
  });
});

describe("Avatar", () => {
  it("provides an accessible name and initials fallback", () => {
    render(<Avatar name="Ada Lovelace" />);

    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveTextContent("AL");
  });
});

describe("Badge", () => {
  it("uses the base-nova variant API", () => {
    render(<Badge variant="secondary">Active</Badge>);

    expect(screen.getByText("Active")).toHaveAttribute("data-slot", "badge");
    expect(screen.getByText("Active")).toHaveClass("bg-secondary");
  });
});

describe("layout primitives", () => {
  it("exposes base-nova card and separator slots", () => {
    render(
      <Card>
        <CardContent>Workspace summary</CardContent>
        <Separator />
      </Card>,
    );

    expect(screen.getByText("Workspace summary")).toHaveAttribute("data-slot", "card-content");
    expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "separator");
  });
});
