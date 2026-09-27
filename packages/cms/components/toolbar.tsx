import { Toolbar as BaseHubToolbar } from "basehub/next-toolbar";
import { keys } from "../keys";

// BaseHub's toolbar throws without a token. Render nothing until
// BASEHUB_TOKEN is configured, matching how the CMS queries already degrade.
// TODO(setup): Set BASEHUB_TOKEN to enable the toolbar. SETUP.md → "BaseHub".
export const Toolbar = () => (keys().BASEHUB_TOKEN ? <BaseHubToolbar /> : null);
