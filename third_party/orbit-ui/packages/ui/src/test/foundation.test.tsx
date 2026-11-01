import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Button,
  Calendar,
  Checkbox,
  Combobox,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Field,
  IconButton,
  Input,
  Progress,
  Tag,
  ThemeProvider,
  Toaster,
  toast,
  useTheme,
} from "../index";
import { axeViolations } from "./axe";

describe("ThemeProvider", () => {
  it("applies theme and density attributes to <html> and persists them", async () => {
    function Switcher() {
      const { setTheme, setDensity } = useTheme();
      return (
        <>
          <button onClick={() => setTheme("dark")}>dark</button>
          <button onClick={() => setDensity("compact")}>compact</button>
        </>
      );
    }
    render(
      <ThemeProvider storageKey="test-theme">
        <Switcher />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveAttribute("data-orbit-theme", "minimal");
    await userEvent.click(screen.getByText("dark"));
    await userEvent.click(screen.getByText("compact"));
    expect(document.documentElement).toHaveAttribute("data-orbit-theme", "dark");
    expect(document.documentElement).toHaveAttribute("data-orbit-density", "compact");
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("test-theme")!)).toMatchObject({
        theme: "dark",
        density: "compact",
      }),
    );
  });

  it("scopes attributes to a wrapper in local mode", () => {
    const { container } = render(
      <ThemeProvider scope="local" theme="scenic">
        content
      </ThemeProvider>,
    );
    expect(container.firstChild).toHaveAttribute("data-orbit-theme", "scenic");
  });
});

describe("Button", () => {
  it("is busy and disabled while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole("button", { name: /Save/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button so it never submits forms accidentally", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("IconButton exposes its label as the accessible name", () => {
    render(<IconButton label="Close" icon={<svg />} tooltip={false} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});

describe("Field", () => {
  it("wires label, description and error to the control", async () => {
    const { container } = render(
      <Field label="Email" description="Work address" error="Invalid email" required>
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: /Email/ });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription("Work address Invalid email");
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Checkbox", () => {
  it("toggles via its label", async () => {
    render(<Checkbox label="Notify watchers" />);
    await userEvent.click(screen.getByText("Notify watchers"));
    expect(screen.getByRole("checkbox", { name: "Notify watchers" })).toBeChecked();
  });
});

describe("Combobox", () => {
  const options = [
    { value: "a", label: "Ava Thompson" },
    { value: "d", label: "Daniel Kim" },
    { value: "p", label: "Priya Raman", keywords: ["me"] },
  ];

  it("filters and selects with the keyboard", async () => {
    const onValueChange = vi.fn();
    render(<Combobox aria-label="Assignee" options={options} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Assignee" }));
    const input = await screen.findByRole("combobox");
    await userEvent.type(input, "me");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await userEvent.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("p");
  });

  it("supports multiple selection", async () => {
    function Multi() {
      const [v, setV] = useState<string[]>([]);
      return (
        <>
          <Combobox multiple aria-label="People" options={options} value={v} onValueChange={setV} />
          <output>{v.join(",")}</output>
        </>
      );
    }
    render(<Multi />);
    await userEvent.click(screen.getByRole("button", { name: "People" }));
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(document.querySelector("output")).toHaveTextContent("a,d");
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");
  });
});

describe("Calendar", () => {
  it("moves focus with arrow keys and selects with Enter", async () => {
    const onValueChange = vi.fn();
    render(<Calendar defaultValue="2026-10-14" onValueChange={onValueChange} initialFocus />);
    const day = screen.getByRole("button", { name: /October 14, 2026/ });
    await waitFor(() => expect(day).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: /October 21, 2026/ })).toHaveFocus();
    await userEvent.keyboard("{PageDown}");
    expect(screen.getByRole("button", { name: /November 21, 2026/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("2026-11-21");
  });
});

describe("Dialog", () => {
  it("traps focus and returns it to the trigger on Escape", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Rename</DialogTitle>
          <input aria-label="Name" />
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    await userEvent.click(trigger);
    expect(await screen.findByRole("dialog", { name: "Rename" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe("Toast", () => {
  it("renders into a live region and can be dismissed", async () => {
    render(<Toaster />);
    toast({ title: "Issue created", tone: "success", duration: Infinity });
    expect(await screen.findByText("Issue created")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Notifications" }).querySelector("[aria-live]"),
    ).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    await waitFor(() => expect(screen.queryByText("Issue created")).not.toBeInTheDocument());
  });
});

describe("Misc", () => {
  it("Tag remove button is labelled", async () => {
    const onRemove = vi.fn();
    render(<Tag onRemove={onRemove}>Backend</Tag>);
    await userEvent.click(screen.getByRole("button", { name: "Remove Backend" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("Progress clamps out-of-range values", () => {
    render(<Progress value={150} max={100} label="Load" />);
    expect(screen.getByRole("progressbar", { name: "Load" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });
});
