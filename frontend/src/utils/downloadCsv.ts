import { API_BASE_URL } from "../lib/apiClient";
import { getAuthToken } from "./tokenHelpers";

/** Download an authenticated CSV endpoint as a file (admin exports). */
export async function downloadCsv(endpoint: string, filename: string): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
