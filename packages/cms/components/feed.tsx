import { Pump } from "basehub/react-pump";
import type { ComponentProps } from "react";
import { keys } from "../keys";

// Pump throws without a token. Show a notice instead of calling the render
// function (which assumes real BaseHub data) until BASEHUB_TOKEN is set.
// TODO(setup): Set BASEHUB_TOKEN to render blog/legal content. SETUP.md → "BaseHub".
export const Feed = (props: ComponentProps<typeof Pump>) =>
  keys().BASEHUB_TOKEN ? (
    <Pump {...props} />
  ) : (
    <p className="text-muted-foreground text-sm">
      CMS content unavailable — BASEHUB_TOKEN not configured.
    </p>
  );
