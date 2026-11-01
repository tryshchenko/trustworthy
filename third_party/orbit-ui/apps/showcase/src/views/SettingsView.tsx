import { RotateCcw } from "@orbit/icons";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Panel,
  Radio,
  RadioGroup,
  Switch,
  toast,
  useTheme,
  type ThemeName,
} from "@orbit/ui";
import { themes } from "@orbit/tokens";
import { useState } from "react";
import { useIssues } from "../state/store";

export function SettingsView() {
  const { theme, setTheme, density, setDensity, transparency, setTransparency, motion, setMotion } =
    useTheme();
  const { dispatch } = useIssues();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="grid max-w-4xl gap-4 pb-4 lg:grid-cols-2">
      <Panel title="Theme" description="Applies instantly and is remembered on this device.">
        <RadioGroup
          value={theme}
          onValueChange={(v) => setTheme(v as ThemeName)}
          aria-label="Theme"
        >
          {(Object.keys(themes) as ThemeName[]).map((t) => (
            <Radio key={t} value={t} label={themes[t].label} description={themes[t].description} />
          ))}
        </RadioGroup>
      </Panel>
      <div className="flex flex-col gap-4">
        <Panel title="Density">
          <RadioGroup
            value={density}
            onValueChange={(v) => setDensity(v as "comfortable" | "compact")}
            aria-label="Density"
          >
            <Radio
              value="comfortable"
              label="Comfortable"
              description="Generous spacing, 36px controls."
            />
            <Radio
              value="compact"
              label="Compact"
              description="Fits more issues on screen, 30px controls."
            />
          </RadioGroup>
        </Panel>
        <Panel title="Accessibility">
          <div className="flex flex-col gap-4">
            <Switch
              label="Reduce transparency"
              description="Replaces glass with opaque surfaces. Also follows your OS setting."
              checked={transparency === "reduced"}
              onCheckedChange={(c) => setTransparency(c ? "reduced" : "auto")}
            />
            <Switch
              label="Reduce motion"
              description="Disables transitions and animations. Also follows your OS setting."
              checked={motion === "reduced"}
              onCheckedChange={(c) => setMotion(c ? "reduced" : "auto")}
            />
          </div>
        </Panel>
        <Panel
          title="Demo data"
          description="Your edits are stored in this browser's local storage."
        >
          <Button
            variant="secondary"
            leadingIcon={<RotateCcw size={15} />}
            onClick={() => setConfirm(true)}
          >
            Reset demo data
          </Button>
        </Panel>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Reset demo data?</DialogTitle>
            <DialogDescription>
              All issues, comments and board changes will return to their original state.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: "reset" });
                setConfirm(false);
                toast({ title: "Demo data reset", tone: "success" });
              }}
            >
              Reset data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
