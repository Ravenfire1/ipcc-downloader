import Constants from "expo-constants";

const API_BASE_URL: string = Constants.expoConfig?.extra?.apiBaseUrl ?? "";

export interface BikeRegistrationInput {
  name: string;
  ownerPushToken?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  make?: string;
  model?: string;
  color?: string;
  serialNumber?: string;
}

export interface BikeSummary {
  id: string;
  name: string;
  registrationCode: string;
  scanUrl: string;
  qrCodeUrl: string;
}

export interface NewBike extends BikeSummary {
  /** Returned only once, at registration. Callers must persist it (see storage.ts). */
  ownerSecret: string;
}

export interface BikeDetail extends BikeSummary {
  createdAt: string;
  owner: { name: string | null; email: string | null; phone: string | null };
  bike: { make: string | null; model: string | null; color: string | null; serialNumber: string | null };
}

export interface ScanRecord {
  id: number;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  location_source: "gps" | "ip" | null;
  ip_city: string | null;
  ip_region: string | null;
  ip_country: string | null;
  scanned_at: string;
}

async function request<T>(path: string, init?: RequestInit, ownerSecret?: string): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      "API base URL is not configured. Set expo.extra.apiBaseUrl in app.json to your deployed Worker URL."
    );
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(ownerSecret ? { Authorization: `Bearer ${ownerSecret}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function registerBike(input: BikeRegistrationInput): Promise<NewBike> {
  return request<NewBike>("/api/bikes", { method: "POST", body: JSON.stringify(input) });
}

export function getBike(id: string, ownerSecret: string): Promise<BikeDetail> {
  return request<BikeDetail>(`/api/bikes/${id}`, undefined, ownerSecret);
}

export function updateBikeToken(
  id: string,
  ownerPushToken: string,
  ownerSecret: string
): Promise<{ ok: true }> {
  return request(
    `/api/bikes/${id}/token`,
    { method: "PATCH", body: JSON.stringify({ ownerPushToken }) },
    ownerSecret
  );
}

export function getBikeScans(id: string, ownerSecret: string): Promise<{ scans: ScanRecord[] }> {
  return request(`/api/bikes/${id}/scans`, undefined, ownerSecret);
}
