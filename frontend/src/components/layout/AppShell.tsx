import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  title: string;
  breadcrumb?: string[];
  action?: ReactNode;
  role?: string;
  userName?: string;
  children: ReactNode;
}

export function AppShell({ title, breadcrumb = ["Overview"], action, role, userName, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Lock body scroll while the mobile overlay is open.
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} role={role} userName={userName} />
      <div className="md:pl-64">
        <TopBar breadcrumb={breadcrumb} onMenuClick={() => setSidebarOpen(true)} action={action} />
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <h1 className="sr-only">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}
