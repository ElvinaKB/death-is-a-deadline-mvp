import { useEffect } from "react";

const SITE_NAME = "Deadline Hotels";

export function useDocumentTitle() {
  useEffect(() => {
    document.title = SITE_NAME;
  }, []);
}
