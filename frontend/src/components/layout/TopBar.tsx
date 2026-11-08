import { Menu } from "lucide-react";
import type { ReactNode } from "react";

interface TopBarProps {
  breadcrumb: string[];
  onMenuClick: () => void;
  action?: ReactNode;
}

export function TopBar({ breadcrumb, onMenuClick, action }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-md p-2 hover:bg-muted md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
        {breadcrumb.map((crumb, index) => {
          const last = index === breadcrumb.length - 1;
          return (
            <span key={`${crumb}-${index}`} className="flex items-center gap-1">
              {index > 0 && <span className="text-muted-foreground">/</span>}
              <span className={last ? "font-medium text-foreground" : "text-muted-foreground"}>
                {crumb}
              </span>
            </span>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <input
          type="search"
          placeholder="Search"
          aria-label="Search"
          className="hidden w-56 rounded-md border border-border bg-card px-3 py-1.5 text-sm sm:block"
        />
        {action}
      </div>
    </header>
  );
}
