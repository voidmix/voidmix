/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { Avatar, Button } from "./index";

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
