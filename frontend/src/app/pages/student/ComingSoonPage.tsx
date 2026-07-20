import { LucideIcon } from "lucide-react";
import { MemberPageShell } from "../../components/member/MemberPageShell";

export function ComingSoonPage({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <MemberPageShell>
      <div className="flex flex-col items-center justify-center rounded-xl border border-line/60 bg-glass-2 px-6 py-20 text-center">
        <div className="rounded-full bg-gold/10 p-4">
          <Icon className="h-8 w-8 text-gold" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-fg">{title}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
        <span className="mt-4 inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
          Coming soon
        </span>
      </div>
    </MemberPageShell>
  );
}
