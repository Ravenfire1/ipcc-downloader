const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I to avoid confusion when read aloud

function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ID_ALPHABET[b % ID_ALPHABET.length];
  return out;
}

/** Short id used in the scan URL, e.g. "k3f8m1qz". */
export function newBikeId(): string {
  return randomString(10).toLowerCase();
}

/** Human-friendly code a rider can read off the sticker, e.g. "BR-7F3K-9QRX". */
export function newRegistrationCode(): string {
  return `BR-${randomString(4)}-${randomString(4)}`;
}
