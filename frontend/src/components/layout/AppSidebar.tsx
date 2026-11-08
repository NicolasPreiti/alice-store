import { NavLink } from "react-router-dom";
import {
  Users,
  LayoutDashboard,
  ShoppingBag,
  Layers,
  UsersRound,
  ShoppingCart,
  Wallet,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: ShoppingBag },
  { to: "/categories", label: "Categories", icon: Layers },
  { to: "/clients", label: "Clients", icon: UsersRound },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/debts", label: "Debts", icon: Wallet },
  { to: "/users", label: "Users", icon: Users, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  role?: string;
  userName?: string;
}

export function AppSidebar({ open, onClose, role, userName }: AppSidebarProps) {
  const items = NAV_ITEMS.filter(
    (item) => !("adminOnly" in item && item.adminOnly) || role === "ADMIN",
  );
  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-hidden={!open ? undefined : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-bold">
              A
            </span>
            <span className="text-lg font-semibold tracking-tight">Alice Store</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1 hover:bg-white/10 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3" aria-label="Main navigation">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-full px-4 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
              {(userName ?? "A").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{userName ?? "Alice"}</p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                {role === "ADMIN" ? "Admin" : "Staff"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
