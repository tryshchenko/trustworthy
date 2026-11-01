import "../../packages/ui/vitest.setup";
import { setProjectAnnotations } from "@storybook/react-vite";
import * as preview from "./.storybook/preview";

setProjectAnnotations([preview]);
