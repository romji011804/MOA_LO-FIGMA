const API_BASE = 'http://localhost:3001/api';

function newStorageKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ls:${crypto.randomUUID()}`;
  }
  return `ls:${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function isStorageAvailable(): boolean {
  return true; // API is always available if server is running
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string): Blob {
  const [header, data] = base64.split(",");
  const mime = header.split(":")[1].split(";")[0];
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

export async function saveFileBlob(file: File | Blob): Promise<string> {
  const toStore =
    file instanceof File
      ? new Blob([await file.arrayBuffer()], { type: file.type || "application/octet-stream" })
      : file;

  const base64 = await blobToBase64(toStore);
  const fileName = file instanceof File ? file.name : 'uploaded-file';

  const response = await fetch(`${API_BASE}/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName,
      fileData: base64,
      mimeType: toStore.type || 'application/octet-stream',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  const result = await response.json();
  return result.id;
}

export async function getFileBlob(key: string): Promise<Blob | null> {
  try {
    const response = await fetch(`${API_BASE}/files/${key}`);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error fetching file:', error);
    return null;
  }
}

