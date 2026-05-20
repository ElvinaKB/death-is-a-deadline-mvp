import { LegalPageLayout } from "./LegalPageLayout";
import { TermsOfServiceContent } from "./TermsOfServiceContent";

export function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Use">
      <TermsOfServiceContent />
    </LegalPageLayout>
  );
}
