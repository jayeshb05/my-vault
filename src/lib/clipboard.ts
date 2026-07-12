import type { VaultItem } from "./types";

async function fetchFileBlob(item: VaultItem): Promise<Blob> {
  const res = await fetch(`/api/files/download?id=${item.id}&action=preview`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch file");
  return res.blob();
}

async function copyImageBlob(blob: Blob, mimeType: string) {
  const type = blob.type?.startsWith("image/") ? blob.type : mimeType || "image/png";
  const imageBlob = blob.type === type ? blob : new Blob([await blob.arrayBuffer()], { type });

  try {
    await navigator.clipboard.write([new ClipboardItem({ [type]: imageBlob })]);
    return;
  } catch {
    // Fallback: render to canvas as PNG
    const url = URL.createObjectURL(imageBlob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const pngBlob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png")
    );
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
  }
}

async function copyPdfBlob(blob: Blob, filename: string) {
  const pdfBlob = new Blob([await blob.arrayBuffer()], { type: "application/pdf" });
  const file = new File([pdfBlob], filename, { type: "application/pdf" });

  try {
    await navigator.clipboard.write([new ClipboardItem({ "application/pdf": pdfBlob })]);
    return;
  } catch {
    /* try file form */
  }

  try {
    await navigator.clipboard.write([new ClipboardItem({ [file.type]: file })]);
    return;
  } catch {
    /* render first page as image */
  }

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = await pdfBlob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport, canvas }).promise;
  const pngBlob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png")
  );
  await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
}

export async function copyVaultItem(item: VaultItem): Promise<void> {
  if (item.type === "note") {
    await navigator.clipboard.writeText(item.content || item.subtitle || item.title);
    return;
  }

  const blob = await fetchFileBlob(item);

  if (item.category === "image") {
    await copyImageBlob(blob, item.mime_type || "image/png");
    return;
  }

  if (item.category === "pdf") {
    await copyPdfBlob(blob, item.title);
    return;
  }

  // Other files: copy actual file blob if supported, else filename
  const mime = item.mime_type || blob.type || "application/octet-stream";
  const file = new File([await blob.arrayBuffer()], item.title, { type: mime });
  try {
    await navigator.clipboard.write([new ClipboardItem({ [mime]: file })]);
  } catch {
    await navigator.clipboard.writeText(item.title);
  }
}

export async function renderPdfThumbnail(itemId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/files/download?id=${itemId}&action=preview`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.arrayBuffer();

    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const pdf = await pdfjs.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.6 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport, canvas }).promise;
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}
