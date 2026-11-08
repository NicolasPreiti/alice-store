import type { ReactNode } from "react";

export interface ResponsiveTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface ResponsiveTableProps<T> {
  rows: T[];
  columns: ResponsiveTableColumn<T>[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
}

export function ResponsiveTable<T>({ rows, columns, keyExtractor, emptyMessage = "No rows yet." }: ResponsiveTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={keyExtractor(row)} className="border-b border-border last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile card stack */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={keyExtractor(row)} className="rounded-xl border border-border bg-card p-4">
            <dl className="space-y-2 text-sm">
              {columns.map((col) => (
                <div key={col.key} className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                    {col.header}
                  </dt>
                  <dd className="text-right">{col.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
