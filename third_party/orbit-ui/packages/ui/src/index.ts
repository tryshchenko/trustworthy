/**
 * @orbit/ui — public API.
 *
 * Styles are shipped separately: import "@orbit/tokens/tokens.css" and
 * "@orbit/ui/styles.css" once at your app root.
 */

/* Theme */
export {
  ThemeProvider,
  useTheme,
  useCycleTheme,
  usePortalContainer,
  type ThemeProviderProps,
  type ThemeContextValue,
  type ThemeSettings,
  type TransparencyPreference,
  type MotionPreference,
} from "./theme/ThemeProvider";
export type { ThemeName, DensityName, Tone } from "@orbit/tokens";

/* Utilities */
export { cn, useControllableState, useMediaQuery } from "./utils";

/* Foundation */
export {
  Button,
  AeroButton,
  IconButton,
  buttonVariants,
  type ButtonProps,
  type IconButtonProps,
} from "./components/foundation/Button";
export {
  Field,
  Label,
  Input,
  Textarea,
  Checkbox,
  RadioGroup,
  Radio,
  Switch,
  Select,
  useFieldControl,
  type FieldProps,
  type InputProps,
  type TextareaProps,
  type CheckboxProps,
  type RadioProps,
  type SwitchProps,
  type SelectProps,
  type SelectOption,
} from "./components/foundation/Form";
export {
  Combobox,
  SearchList,
  defaultFilter,
  type ComboboxProps,
  type ComboboxSingleProps,
  type ComboboxMultipleProps,
  type ListOption,
  type SearchListProps,
} from "./components/foundation/Combobox";
export {
  Calendar,
  DatePicker,
  toISODate,
  fromISODate,
  type CalendarProps,
  type DatePickerProps,
  type ISODate,
} from "./components/foundation/DatePicker";
export {
  Badge,
  Tag,
  Avatar,
  AvatarGroup,
  Card,
  Panel,
  Separator,
  Breadcrumb,
  badgeVariants,
  cardVariants,
  initials,
  type BadgeProps,
  type BadgeVariant,
  type TagProps,
  type AvatarProps,
  type AvatarGroupProps,
  type CardProps,
  type PanelProps,
  type SeparatorProps,
  type BreadcrumbProps,
  type BreadcrumbItem,
} from "./components/foundation/Display";
export {
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  type TooltipProps,
  type PopoverContentProps,
  type DropdownMenuItemProps,
  type DialogContentProps,
  type DrawerContentProps,
} from "./components/foundation/Overlays";
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ScrollArea,
  type TabsListProps,
  type TabsTriggerProps,
  type ScrollAreaProps,
} from "./components/foundation/Navigation";
export {
  Spinner,
  Skeleton,
  Progress,
  EmptyState,
  Kbd,
  VisuallyHidden,
  type SpinnerProps,
  type SkeletonProps,
  type ProgressProps,
  type EmptyStateProps,
} from "./components/foundation/Feedback";
export {
  Toaster,
  toast,
  useToasts,
  type ToastOptions,
  type ToastRecord,
  type ToastTone,
  type ToasterProps,
} from "./components/foundation/Toast";

/* Aero */
export { GlassPanel, glassPanelVariants, type GlassPanelProps } from "./components/aero/GlassPanel";
export { AeroBackground, type AeroBackgroundProps } from "./components/aero/AeroBackground";
export {
  AeroSidebar,
  SidebarSection,
  SidebarItem,
  useSidebar,
  type AeroSidebarProps,
  type SidebarSectionProps,
  type SidebarItemProps,
} from "./components/aero/AeroSidebar";
export {
  AeroHeader,
  HeaderSearch,
  type AeroHeaderProps,
  type HeaderSearchProps,
} from "./components/aero/AeroHeader";
export {
  FloatingInspector,
  type FloatingInspectorProps,
} from "./components/aero/FloatingInspector";
export {
  StatusPill,
  StatusGlyph,
  type StatusPillProps,
  type StatusShape,
} from "./components/aero/StatusPill";
export { AppShell, type AppShellProps } from "./components/aero/AppShell";

/* Product */
export * from "./components/product/types";
export {
  IssueTypeIcon,
  PriorityIndicator,
  type IssueTypeIconProps,
  type PriorityIndicatorProps,
} from "./components/product/Indicators";
export { IssueCard, type IssueCardProps } from "./components/product/IssueCard";
export {
  KanbanBoard,
  KanbanColumn,
  type KanbanBoardProps,
  type KanbanColumnProps,
  type KanbanColumnDefinition,
  type KanbanMove,
  type KanbanRenderState,
  type KanbanDragHandleProps,
} from "./components/product/Kanban";
export {
  AssigneeSelector,
  StatusSelector,
  PrioritySelector,
  ProjectSwitcher,
  ProjectIcon,
  type AssigneeSelectorProps,
  type StatusSelectorProps,
  type PrioritySelectorProps,
  type ProjectSwitcherProps,
  type ProjectSummary,
} from "./components/product/Selectors";
export {
  FilterBar,
  type FilterBarProps,
  type FilterDefinition,
} from "./components/product/FilterBar";
export {
  CommandPalette,
  useHotkey,
  type CommandItem,
  type CommandPaletteProps,
  type HotkeyOptions,
} from "./components/product/CommandPalette";
export {
  IssueDetailPanel,
  IssueDetailSection,
  PropertyList,
  EditableText,
  type IssueDetailPanelProps,
  type IssueDetailSectionProps,
  type PropertyItem,
  type EditableTextProps,
} from "./components/product/IssueDetail";
export {
  IssueEditor,
  validateIssueDraft,
  type IssueDraft,
  type IssueEditorProps,
} from "./components/product/IssueEditor";
export {
  ActivityFeed,
  CommentThread,
  formatRelativeTime,
  type ActivityItem,
  type ActivityFeedProps,
  type Comment,
  type CommentThreadProps,
} from "./components/product/Activity";
export {
  ProgressSummary,
  SprintHeader,
  type ProgressSegment,
  type ProgressSummaryProps,
  type SprintHeaderProps,
} from "./components/product/Summary";
export {
  DataGrid,
  type DataGridColumn,
  type DataGridProps,
  type DataGridSort,
} from "./components/product/DataGrid";
export {
  BacklogList,
  type BacklogItem,
  type BacklogListProps,
} from "./components/product/BacklogList";
