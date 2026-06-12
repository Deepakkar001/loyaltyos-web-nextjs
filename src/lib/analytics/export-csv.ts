import { analyticsApi } from "@/lib/api/client";
import { apiClient } from "@/lib/api/client";

export async function downloadAnalyticsCsv(
  path: string,
  params: Record<string, string>,
  filename: string
): Promise<void> {
  await analyticsApi.downloadExport(path, params, filename);
}

export async function downloadApiCsv(
  url: string,
  params: Record<string, string>,
  filename: string
): Promise<void> {
  const res = await apiClient.get(url, { params, responseType: "blob" });
  triggerBlobDownload(res.data as Blob, filename);
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function reportFilename(prefix: string, programmeUid: string, from?: string, to?: string): string {
  if (from && to) {
    return `${prefix}-${programmeUid}-${from}-to-${to}.csv`;
  }
  return `${prefix}-${programmeUid}.csv`;
}
