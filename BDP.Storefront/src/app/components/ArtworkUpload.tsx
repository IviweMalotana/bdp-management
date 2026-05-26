"use client";
import { useRef, useState } from "react";
import { uploadArtwork, removeArtwork } from "@/lib/api";

interface ArtworkUploadProps {
  cartItemId: number;
  sessionToken: string;
  jwt?: string;
  initialArtwork?: { fileName: string; fileUrl: string } | null;
}

export default function ArtworkUpload({
  cartItemId,
  sessionToken,
  jwt,
  initialArtwork,
}: ArtworkUploadProps) {
  const [artwork, setArtwork] = useState<{ fileName: string; fileUrl: string } | null>(
    initialArtwork ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const result = await uploadArtwork(cartItemId, file, undefined, sessionToken, jwt);
      setArtwork({ fileName: result.fileName, fileUrl: result.fileUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    try {
      await removeArtwork(cartItemId, sessionToken, jwt);
      setArtwork(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove artwork.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.ai,.eps,.png,.jpg,.jpeg,.svg"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload artwork file"
      />

      {artwork ? (
        <div className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#D4A89A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="text-xs truncate max-w-[180px]" style={{ color: "#4A4540" }}>
            {artwork.fileName}
          </span>
          <button
            onClick={handleRemove}
            disabled={uploading}
            className="text-xs hover:opacity-70 disabled:opacity-40"
            style={{ color: "#C9B8A8" }}
          >
            {uploading ? "Removing…" : "Remove"}
          </button>
        </div>
      ) : (
        <div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs hover:opacity-70 disabled:opacity-40"
            style={{ color: "#4A4540" }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploading ? "Uploading…" : "Upload artwork / print file"}
          </button>
          <p className="text-[10px] mt-0.5" style={{ color: "#C9B8A8" }}>
            PDF, AI, EPS, PNG, JPG, SVG · max 20 MB
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs mt-1" style={{ color: "#C0392B" }}>
          {error}
        </p>
      )}
    </div>
  );
}
