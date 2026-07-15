import apiClient from "./client";

interface DownloadProjectZipOptions {
  fallbackFileName?: string;
}

function createSafeFileName(value: string) {
  const safeName = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return safeName || "ai-film-studio-project";
}

function getFileNameFromContentDisposition(
  contentDisposition: string | undefined
): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)/i
  );

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const regularMatch = contentDisposition.match(
    /filename="?([^";]+)"?/i
  );

  return regularMatch?.[1]?.trim() ?? null;
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  downloadLink.style.display = "none";

  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 100);
}

export async function downloadProjectZip(
  projectId: string,
  options: DownloadProjectZipOptions = {}
): Promise<void> {
  if (!projectId.trim()) {
    throw new Error("A project ID is required to export a ZIP file.");
  }

  const response = await apiClient.get<Blob>(
    `/api/projects/${encodeURIComponent(projectId)}/export/zip`,
    {
      responseType: "blob",
      headers: {
        Accept: "application/zip",
      },
    }
  );

  const contentDisposition = response.headers["content-disposition"] as
    | string
    | undefined;

  const responseFileName =
    getFileNameFromContentDisposition(contentDisposition);

  const fallbackFileName = `${createSafeFileName(
    options.fallbackFileName || "ai-film-studio-project"
  )}.zip`;

  triggerBlobDownload(
    response.data,
    responseFileName || fallbackFileName
  );
}