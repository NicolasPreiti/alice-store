import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { useMe } from "@/features/auth/hooks/useMe";

export function OverviewPage() {
  const { user } = useMe();
  return (
    <AppShell title="Overview" role={user?.role} userName={user?.name}>
      <PageHeader
        title="Overview"
        subtitle="Store at a glance. Real KPIs land with the dashboard slice."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Today's sales", value: "—" },
          { label: "Stock value", value: "—" },
          { label: "Open debts", value: "—" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
