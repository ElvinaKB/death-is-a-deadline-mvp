import { AlertTriangle } from "lucide-react";
import { PREVIEW_BYPASS } from "../../../config/previewBypass";

export function PreviewBypassBanner() {
  if (!PREVIEW_BYPASS) return null;

  return (
    <div
      role="status"
      className="bg-amber-950/90 border-b border-amber-600/40 px-4 py-2 text-center text-sm text-amber-100"
    >
      <p className="flex flex-wrap items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
        <span>
          <strong>Preview bypass</strong> — mock API, no backend. Auto-login:{" "}
          <code className="text-amber-200">student@university.edu</code> /{" "}
          <code className="text-amber-200">student123</code>
        </span>
        <span className="text-amber-200/80 text-xs">
          Revert: <code className="text-amber-200">frontend/PREVIEW_BYPASS_REVERT.txt</code>
        </span>
      </p>
    </div>
  );
}
