import { Link } from "react-router-dom";
import { HomeHeader } from "../../components/home";
import { SiteFooter } from "../../components/common/SiteFooter";
import { ROUTES } from "../../../config/routes.config";

interface LegalPageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <HomeHeader variant="dark" />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        <Link
          to={ROUTES.HOME}
          className="text-sm text-gold hover:text-gold-light mb-6 inline-block"
        >
          ← Back to marketplace
        </Link>
        <h1 className="text-3xl font-bold text-gold-light mb-8">{title}</h1>
        <article className="prose-legal space-y-4 text-muted text-sm leading-relaxed">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
