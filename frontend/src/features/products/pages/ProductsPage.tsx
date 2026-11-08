import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResponsiveTable, type ResponsiveTableColumn } from "@/components/layout/ResponsiveTable";
import { useMe } from "@/features/auth/hooks/useMe";
import { AppShell } from "@/components/layout/AppShell";
import { useProducts } from "../hooks/useProducts";
import type { Product } from "@/api/products";

const columns: ResponsiveTableColumn<Product>[] = [
  { key: "name", header: "Name", render: (p) => <span className="font-medium">{p.name}</span> },
  { key: "sku", header: "SKU", render: (p) => p.sku },
  { key: "category", header: "Category", render: (p) => p.category.name },
  { key: "stock", header: "Stock", render: (p) => p.stock.toString() },
  { key: "cost", header: "Cost", render: (p) => p.cost },
  { key: "price", header: "Price", render: (p) => p.price },
  {
    key: "status",
    header: "Status",
    render: (p) => (
      <span
        className={
          p.isActive
            ? "rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground"
            : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
        }
      >
        {p.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
  {
    key: "actions",
    header: "Actions",
    render: (p) => (
      <Link to={`/products/${p.id}/edit`} className="text-primary underline underline-offset-4">
        Edit
      </Link>
    ),
  },
];

export function ProductsPage() {
  const { user } = useMe();
  const { data, isLoading, isError } = useProducts();

  return (
    <AppShell
      title="Products"
      breadcrumb={["Overview", "Products"]}
      role={user?.role}
      userName={user?.name}
      action={
        <Button asChild>
          <Link to="/products/new">New product</Link>
        </Button>
      }
    >
      <PageHeader title="Products" subtitle="Catalog of everything you sell." />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading products…</p>
      ) : isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load products. Try again.
        </p>
      ) : (
        <ResponsiveTable<Product>
          rows={data ?? []}
          columns={columns}
          keyExtractor={(p) => p.id}
          emptyMessage="No products yet."
        />
      )}
    </AppShell>
  );
}
