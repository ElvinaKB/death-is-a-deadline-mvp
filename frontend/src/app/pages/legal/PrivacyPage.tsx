import { LegalPageLayout } from "./LegalPageLayout";
import { PrivacyPolicyContent } from "./PrivacyPolicyContent";

export function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <PrivacyPolicyContent />
    </LegalPageLayout>
  );
}
