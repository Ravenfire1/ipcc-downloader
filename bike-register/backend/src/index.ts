import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import { newBikeId, newRegistrationCode } from "./ids";
import { bearerToken, hashSecret, newOwnerSecret } from "./auth";
import { qrCodeSvg } from "./qr";
import { sendExpoPush } from "./push";
import { scanPageHtml } from "./scanPage";

type Bindings = {
  DB: D1Database;
  APP_BASE_URL: string;
};

interface BikeRow {
  id: string;
  name: string;
  owner_push_token: string | null;
  registration_code: string;
  owner_secret_hash: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  serial_number: string | null;
  created_at: string;
}

interface BikeRegistrationInput {
  name?: string;
  ownerPushToken?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  make?: string;
  model?: string;
  color?: string;
  serialNumber?: string;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors());

function scanUrl(env: Bindings, bikeId: string): string {
  return `${env.APP_BASE_URL.replace(/\/$/, "")}/scan/${bikeId}`;
}

/**
 * Only whoever holds the owner secret handed out at registration may read or change a bike's
 * private details. The bike id embedded in the public QR/scan URL is not treated as a credential.
 */
async function authorizeOwner(
  c: Context<{ Bindings: Bindings }>,
  id: string
): Promise<{ ok: true; bike: BikeRow } | { ok: false; response: Response }> {
  const bike = await c.env.DB.prepare("SELECT * FROM bikes WHERE id = ?").bind(id).first<BikeRow>();
  if (!bike) return { ok: false, response: c.json({ error: "bike not found" }, 404) };

  const token = bearerToken(c.req.header("authorization"));
  if (!token || (await hashSecret(token)) !== bike.owner_secret_hash) {
    return { ok: false, response: c.json({ error: "unauthorized" }, 401) };
  }
  return { ok: true, bike };
}

// --- Register a new bike -----------------------------------------------

app.post("/api/bikes", async (c) => {
  const body = await c.req
    .json<BikeRegistrationInput>()
    .catch(() => ({}) as BikeRegistrationInput);
  const name = (body.name ?? "").trim();
  if (!name) return c.json({ error: "name is required" }, 400);

  const id = newBikeId();
  const registrationCode = newRegistrationCode();
  const ownerSecret = newOwnerSecret();
  const ownerSecretHash = await hashSecret(ownerSecret);

  await c.env.DB.prepare(
    `INSERT INTO bikes
      (id, name, owner_push_token, registration_code, owner_secret_hash, owner_name, owner_email, owner_phone, make, model, color, serial_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      name,
      body.ownerPushToken ?? null,
      registrationCode,
      ownerSecretHash,
      body.ownerName ?? null,
      body.ownerEmail ?? null,
      body.ownerPhone ?? null,
      body.make ?? null,
      body.model ?? null,
      body.color ?? null,
      body.serialNumber ?? null
    )
    .run();

  return c.json({
    id,
    name,
    registrationCode,
    // Shown only this once. The app must save it locally — it's the only proof of
    // ownership over this bike's private data and push-notification target.
    ownerSecret,
    scanUrl: scanUrl(c.env, id),
    qrCodeUrl: `${c.env.APP_BASE_URL.replace(/\/$/, "")}/api/bikes/${id}/qrcode.svg`,
  });
});

// --- Update which device gets notified for a bike -----------------------

app.patch("/api/bikes/:id/token", async (c) => {
  const id = c.req.param("id");
  const auth = await authorizeOwner(c, id);
  if (!auth.ok) return auth.response;

  const body = await c.req
    .json<{ ownerPushToken?: string }>()
    .catch(() => ({}) as { ownerPushToken?: string });
  if (!body.ownerPushToken) return c.json({ error: "ownerPushToken is required" }, 400);

  await c.env.DB.prepare("UPDATE bikes SET owner_push_token = ? WHERE id = ?")
    .bind(body.ownerPushToken, id)
    .run();

  return c.json({ ok: true });
});

// --- Edit registration details (owner + bike info) after the fact ---------

app.patch("/api/bikes/:id", async (c) => {
  const id = c.req.param("id");
  const auth = await authorizeOwner(c, id);
  if (!auth.ok) return auth.response;

  const body = await c.req.json<BikeRegistrationInput>().catch(() => ({}) as BikeRegistrationInput);

  await c.env.DB.prepare(
    `UPDATE bikes SET
      name = COALESCE(?, name),
      owner_name = COALESCE(?, owner_name),
      owner_email = COALESCE(?, owner_email),
      owner_phone = COALESCE(?, owner_phone),
      make = COALESCE(?, make),
      model = COALESCE(?, model),
      color = COALESCE(?, color),
      serial_number = COALESCE(?, serial_number)
     WHERE id = ?`
  )
    .bind(
      body.name ?? null,
      body.ownerName ?? null,
      body.ownerEmail ?? null,
      body.ownerPhone ?? null,
      body.make ?? null,
      body.model ?? null,
      body.color ?? null,
      body.serialNumber ?? null,
      id
    )
    .run();

  return c.json({ ok: true });
});

// --- Fetch bike info ------------------------------------------------------

app.get("/api/bikes/:id", async (c) => {
  const id = c.req.param("id");
  const auth = await authorizeOwner(c, id);
  if (!auth.ok) return auth.response;
  const bike = auth.bike;

  return c.json({
    id: bike.id,
    name: bike.name,
    registrationCode: bike.registration_code,
    createdAt: bike.created_at,
    owner: {
      name: bike.owner_name,
      email: bike.owner_email,
      phone: bike.owner_phone,
    },
    bike: {
      make: bike.make,
      model: bike.model,
      color: bike.color,
      serialNumber: bike.serial_number,
    },
    scanUrl: scanUrl(c.env, bike.id),
    qrCodeUrl: `${c.env.APP_BASE_URL.replace(/\/$/, "")}/api/bikes/${bike.id}/qrcode.svg`,
  });
});

// --- Printable QR code for the sticker ------------------------------------

app.get("/api/bikes/:id/qrcode.svg", async (c) => {
  const id = c.req.param("id");
  const bike = await c.env.DB.prepare("SELECT id FROM bikes WHERE id = ?").bind(id).first();
  if (!bike) return c.json({ error: "bike not found" }, 404);

  const svg = qrCodeSvg(scanUrl(c.env, id));
  return c.body(svg, 200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" });
});

// --- Scan history for the app's map / list view ---------------------------

app.get("/api/bikes/:id/scans", async (c) => {
  const id = c.req.param("id");
  const auth = await authorizeOwner(c, id);
  if (!auth.ok) return auth.response;

  const { results } = await c.env.DB.prepare(
    "SELECT id, lat, lng, accuracy, location_source, ip_city, ip_region, ip_country, scanned_at " +
      "FROM scans WHERE bike_id = ? ORDER BY scanned_at DESC LIMIT 50"
  )
    .bind(id)
    .all();

  return c.json({ scans: results });
});

// --- The page a scanner's phone actually opens ----------------------------

app.get("/scan/:id", async (c) => {
  const id = c.req.param("id");
  const bike = await c.env.DB.prepare("SELECT id, name FROM bikes WHERE id = ?")
    .bind(id)
    .first<Pick<BikeRow, "id" | "name">>();

  if (!bike) return c.text("This QR code isn't registered to a bike.", 404);
  return c.html(scanPageHtml(bike.name, bike.id));
});

// --- Record a scan + notify the owner --------------------------------------

app.post("/api/scan/:id", async (c) => {
  const id = c.req.param("id");
  const bike = await c.env.DB.prepare(
    "SELECT id, name, owner_push_token FROM bikes WHERE id = ?"
  )
    .bind(id)
    .first<Pick<BikeRow, "id" | "name" | "owner_push_token">>();

  if (!bike) return c.json({ error: "bike not found" }, 404);

  const body = await c.req
    .json<{ lat?: number; lng?: number; accuracy?: number }>()
    .catch(() => ({}) as { lat?: number; lng?: number; accuracy?: number });
  const cf = (c.req.raw as unknown as { cf?: IncomingRequestCfProperties }).cf;

  const hasBrowserLocation = typeof body.lat === "number" && typeof body.lng === "number";
  const lat = hasBrowserLocation ? body.lat! : cf?.latitude ? Number(cf.latitude) : null;
  const lng = hasBrowserLocation ? body.lng! : cf?.longitude ? Number(cf.longitude) : null;

  await c.env.DB.prepare(
    `INSERT INTO scans
      (bike_id, lat, lng, accuracy, location_source, ip, ip_city, ip_region, ip_country, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      lat,
      lng,
      hasBrowserLocation ? body.accuracy ?? null : null,
      hasBrowserLocation ? "gps" : "ip",
      c.req.header("cf-connecting-ip") ?? null,
      cf?.city ?? null,
      cf?.region ?? null,
      cf?.country ?? null,
      c.req.header("user-agent") ?? null
    )
    .run();

  const place = [cf?.city, cf?.country].filter(Boolean).join(", ");
  const mapsUrl = lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : undefined;

  await sendExpoPush({
    to: bike.owner_push_token ?? "",
    title: `📍 ${bike.name} was just scanned`,
    body: place ? `Someone scanned its QR code near ${place}.` : "Someone scanned its QR code.",
    data: { bikeId: bike.id, lat, lng, mapsUrl },
  });

  return c.json({ ok: true });
});

app.get("/", (c) => c.text("Bike Register API"));

export default app;
