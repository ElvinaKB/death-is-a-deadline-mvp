export function LegalMeta({
  operator,
  effectiveDate,
  lastUpdated,
}: {
  operator: string;
  effectiveDate: string;
  lastUpdated: string;
}) {
  return (
    <div className="space-y-2 pb-6 border-b border-line/50 text-muted">
      <p className="text-fg font-medium">{operator}</p>
      <p>
        Effective Date: {effectiveDate}
        <br />
        Last Updated: {lastUpdated}
      </p>
    </div>
  );
}

export function LegalToc({ items }: { items: string[] }) {
  return (
    <nav
      className="rounded-lg border border-line/50 p-4 my-6"
      aria-label="Contents"
    >
      <p className="text-fg font-semibold mb-2">Contents</p>
      <ol className="list-decimal pl-5 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </nav>
  );
}

export function LegalH2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-fg pt-8 first:pt-0">{children}</h2>
  );
}

export function LegalH3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-fg pt-4">{children}</h3>;
}

export function LegalP({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed">{children}</p>;
}

export function LegalUl({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-fg text-sm leading-relaxed">
      {children}
    </p>
  );
}

export function LegalCopyright({ text }: { text: string }) {
  return (
    <p className="text-xs pt-8 mt-8 border-t border-line/50">{text}</p>
  );
}
