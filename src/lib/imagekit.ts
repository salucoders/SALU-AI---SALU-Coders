
const PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || "";
const URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || "";
const AUTH_ENDPOINT = "/api/imagekit/auth";

export const imageKitConfig = {
  publicKey: PUBLIC_KEY,
  urlEndpoint: URL_ENDPOINT,
  authenticationEndpoint: AUTH_ENDPOINT,
};

/**
 * Checks if ImageKit is properly configured on the client side.
 * Validates that the urlEndpoint is present and looks like a valid ImageKit URL.
 */
export function isImageKitConfigured(): boolean {
  if (!imageKitConfig.urlEndpoint || imageKitConfig.urlEndpoint === "IMAGEKIT_URL_ENDPOINT") {
    return false;
  }
  return imageKitConfig.urlEndpoint.startsWith("https://ik.imagekit.io/");
}

export interface ImageKitFile {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  size: number;
  createdAt: string;
  tags?: string[];
  filePath: string;
}

export async function uploadToImageKit(file: File | string, fileName?: string): Promise<ImageKitFile> {
  const formData = new FormData();
  if (typeof file === 'string') {
    // base64
    formData.append('file', file);
  } else {
    formData.append('file', file);
  }
  formData.append('fileName', fileName || `upload-${Date.now()}`);

  const { doc, getDoc } = await import('firebase/firestore');
  const { db } = await import('./firebase');
  
  let privateKey = '';
  let urlEndpoint = '';
  let publicKey = '';
  
  const configDoc = await getDoc(doc(db, 'system', 'config'));
  if (configDoc.exists()) {
    const data = configDoc.data();
    privateKey = data.imageKitPrivateKey || '';
    urlEndpoint = data.imageKitUrlEndpoint || '';
    publicKey = data.imageKitPublicKey || '';
  }

  const response = await fetch('/api/imagekit/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-imagekit-public-key': publicKey,
      'x-imagekit-private-key': privateKey,
      'x-imagekit-url-endpoint': urlEndpoint,
    },
    body: JSON.stringify({
      file: typeof file === 'string' ? file : await fileToBase64(file),
      fileName: fileName || (file instanceof File ? file.name : `image-${Date.now()}`),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Upload failed");
  }

  return response.json();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
