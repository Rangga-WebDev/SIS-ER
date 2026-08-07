/** @format */

// Validasi tipe file dari magic bytes, bukan MIME yang dikirim client.
const SIGNATURES: { mime: string; check: (bytes: Uint8Array) => boolean }[] = [
  {
    mime: "application/pdf",
    check: (b) =>
      b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  },
  {
    mime: "image/jpeg",
    check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    check: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    mime: "image/webp",
    check: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
];

export function sniffMimeType(buffer: Buffer | Uint8Array): string | null {
  const bytes = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;

  if (bytes.length < 12) return null;

  for (const signature of SIGNATURES) {
    if (signature.check(bytes)) return signature.mime;
  }

  return null;
}

export function validateFileContent(
  buffer: Buffer | Uint8Array,
  allowedMimeTypes: string[],
): { valid: boolean; detectedMime: string | null } {
  const detectedMime = sniffMimeType(buffer);

  return {
    valid: Boolean(detectedMime && allowedMimeTypes.includes(detectedMime)),
    detectedMime,
  };
}
