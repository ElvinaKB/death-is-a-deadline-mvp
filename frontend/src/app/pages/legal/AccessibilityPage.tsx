import { LegalPageLayout } from "./LegalPageLayout";
import { AccessibilityStatementContent } from "./AccessibilityStatementContent";

export function AccessibilityPage() {
  return (
    <LegalPageLayout title="Accessibility Statement">
      <AccessibilityStatementContent />
    </LegalPageLayout>
  );
}
