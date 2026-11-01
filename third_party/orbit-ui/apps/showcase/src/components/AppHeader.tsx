import { Bell, LogOut, Moon, Palette, Plus, Rows3, Settings, Sun, UserRound } from "@orbit/icons";
import {
  AeroButton,
  AeroHeader,
  Avatar,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  HeaderSearch,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  toast,
  useTheme,
  type ThemeName,
} from "@orbit/ui";
import { OrbitLogo } from "@orbit/icons";
import { memo, useState } from "react";
import { CURRENT_USER_ID, people } from "../data/mock";

interface Props {
  onOpenPalette: () => void;
  onCreate: () => void;
  onMenu: () => void;
  onOpenSettings: () => void;
  onOpenIssue: (key: string) => void;
}

const me = people.find((p) => p.id === CURRENT_USER_ID)!;

const initialNotifications = [
  {
    id: "n1",
    who: "Daniel Kim",
    text: "mentioned you on PLAT-87",
    issue: "PLAT-87",
    unread: true,
    when: "12m ago",
  },
  {
    id: "n2",
    who: "Samuel Okafor",
    text: "moved PLAT-93 to In review",
    issue: "PLAT-93",
    unread: true,
    when: "1h ago",
  },
  {
    id: "n3",
    who: "Lena Fischer",
    text: "commented on PLAT-89",
    issue: "PLAT-89",
    unread: false,
    when: "Yesterday",
  },
];

export const AppHeader = memo(function AppHeader({
  onOpenPalette,
  onCreate,
  onMenu,
  onOpenSettings,
  onOpenIssue,
}: Props) {
  const { theme, setTheme, density, setDensity } = useTheme();
  const [notifications, setNotifications] = useState(initialNotifications);
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <AeroHeader
      onMenuClick={onMenu}
      logo={
        <>
          <OrbitLogo size={28} />
          <span className="hidden sm:inline">
            Orbit <span className="font-normal text-fg-muted">Projects</span>
          </span>
        </>
      }
      search={<HeaderSearch onClick={onOpenPalette} />}
      actions={
        <>
          <AeroButton
            onClick={() => onCreate()}
            leadingIcon={<Plus size={16} />}
            aria-keyshortcuts="C"
            className="max-sm:!px-2.5"
          >
            <span className="max-sm:sr-only">Create</span>
          </AeroButton>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="orb-button orb-button--ghost orb-button--md orb-button--icon"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
              >
                <Bell size={18} aria-hidden />
                {unread > 0 && (
                  <span className="absolute top-1 right-1">
                    <Badge size="sm" variant="danger" appearance="solid" aria-hidden>
                      {unread}
                    </Badge>
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" padding="none" className="w-[min(360px,calc(100vw-24px))]">
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <h2 className="m-0 text-[15px] font-semibold">Notifications</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!unread}
                  onClick={() => {
                    setNotifications((ns) => ns.map((n) => ({ ...n, unread: false })));
                    toast({ title: "All notifications marked as read", tone: "success" });
                  }}
                >
                  Mark all read
                </Button>
              </div>
              <ul className="m-0 list-none p-1.5">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className="orb-menu__item items-start! gap-3!"
                      onClick={() => {
                        setNotifications((ns) =>
                          ns.map((x) => (x.id === n.id ? { ...x, unread: false } : x)),
                        );
                        onOpenIssue(n.issue);
                      }}
                    >
                      <Avatar name={n.who} size="sm" decorative />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[13px]">
                          <strong>{n.who}</strong> {n.text}
                        </span>
                        <span className="text-xs text-fg-muted">{n.when}</span>
                      </span>
                      {n.unread && (
                        <span
                          className="mt-2 size-2 shrink-0 rounded-full bg-accent"
                          aria-label="Unread"
                          role="img"
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                label="Appearance"
                icon={theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
                className="max-sm:hidden"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeName)}>
                <DropdownMenuRadioItem value="minimal">Aero Minimal</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="scenic">Aero Scenic</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Aero Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="accessible">Accessible</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Density</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={density}
                onValueChange={(v) => setDensity(v as "comfortable" | "compact")}
              >
                <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="orb-button orb-button--ghost orb-button--md orb-button--icon"
                aria-label={`Account: ${me.name}`}
              >
                <Avatar name={me.name} size="sm" status="online" decorative />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{me.name}</DropdownMenuLabel>
              <DropdownMenuItem
                icon={<UserRound size={15} />}
                onSelect={() => toast({ title: "Profiles aren't part of this demo", tone: "info" })}
              >
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem icon={<Palette size={15} />} onSelect={onOpenSettings}>
                Appearance
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<Rows3 size={15} />}
                onSelect={() => setDensity(density === "compact" ? "comfortable" : "compact")}
              >
                {density === "compact" ? "Comfortable density" : "Compact density"}
              </DropdownMenuItem>
              <DropdownMenuItem icon={<Settings size={15} />} onSelect={onOpenSettings}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                icon={<LogOut size={15} />}
                onSelect={() =>
                  toast({ title: "Signing out isn't available in the demo", tone: "info" })
                }
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
});
