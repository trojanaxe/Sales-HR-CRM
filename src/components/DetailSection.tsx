export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-brand-divider pt-6">
      <h2 className="font-heading text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function DetailGrid({ rows }: { rows: [label: string, value: string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-gray-500">{label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
