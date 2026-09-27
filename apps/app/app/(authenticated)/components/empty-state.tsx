import type { ReactNode } from "react";

interface EmptyStateProperties {
  readonly title: string;
  readonly children: ReactNode;
}

// Shown instead of a 404 or a thrown error when a page cannot render yet,
// e.g. no active organization or an optional integration without its key.
export const EmptyState = ({ title, children }: EmptyStateProperties) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
    <h2 className="font-semibold text-lg">{title}</h2>
    <p className="max-w-md text-muted-foreground text-sm">{children}</p>
  </div>
);

export const NoOrganization = () => (
  <EmptyState title="No organization selected">
    Create or select an organization using the switcher at the top of the
    sidebar to continue.
  </EmptyState>
);
