import { auth } from "@repo/auth/server";
import { webhooks } from "@repo/webhooks";
import { keys } from "@repo/webhooks/keys";
import { EmptyState, NoOrganization } from "../components/empty-state";

export const metadata = {
  title: "Webhooks",
  description: "Send webhooks to your users.",
};

const WebhooksPage = async () => {
  // TODO(setup): Set SVIX_TOKEN in apps/app/.env.local. SETUP.md → "Svix".
  if (!keys().SVIX_TOKEN) {
    return (
      <EmptyState title="Webhooks not configured">
        Set SVIX_TOKEN in apps/app/.env.local to enable the Svix webhooks
        portal.
      </EmptyState>
    );
  }

  const { orgId } = await auth();

  if (!orgId) {
    return <NoOrganization />;
  }

  const response = await webhooks.getAppPortal();

  if (!response?.url) {
    return (
      <EmptyState title="Webhooks unavailable">
        The Svix app portal did not return a URL. Check your Svix
        configuration.
      </EmptyState>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <iframe
        allow="clipboard-write"
        className="h-full w-full border-none"
        loading="lazy"
        src={response.url}
        title="Webhooks"
      />
    </div>
  );
};

export default WebhooksPage;
