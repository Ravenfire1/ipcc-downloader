export function scanPageHtml(bikeName: string, bikeId: string): string {
  const safeName = bikeName.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Bike Register</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    margin: 0; padding: 24px; display: flex; min-height: 100vh; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; background: #0f1220; color: #f4f5f8;
  }
  .card { max-width: 420px; }
  .badge { font-size: 40px; margin-bottom: 12px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { font-size: 15px; line-height: 1.5; color: #b7bad0; margin: 0 0 16px; }
  .status { font-size: 14px; padding: 12px 16px; border-radius: 10px; background: #1b2036; margin-top: 8px; }
  .status.ok { background: #133b23; color: #8fe3ac; }
  .status.err { background: #3b2313; color: #e3b98f; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #444; border-top-color: #fff;
    border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: -2px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">🚲</div>
    <h1>${safeName} is a registered bike</h1>
    <p>This bike is registered with Bike Register. To help reunite it with its owner, we'll share your
       approximate location with them now &mdash; no other information about you is collected.</p>
    <div id="status" class="status"><span class="spinner"></span>Getting your location&hellip;</div>
  </div>
  <script>
    const bikeId = ${JSON.stringify(bikeId)};
    const statusEl = document.getElementById('status');

    function setStatus(text, cls) {
      statusEl.textContent = text;
      statusEl.className = 'status' + (cls ? ' ' + cls : '');
    }

    async function reportScan(position) {
      try {
        const res = await fetch('/api/scan/' + encodeURIComponent(bikeId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(position || {}),
        });
        if (!res.ok) throw new Error('request failed');
        setStatus('Thanks! The owner has been notified. 🙏', 'ok');
      } catch (e) {
        setStatus('Thanks for scanning. We could not reach the owner right now, please try again shortly.', 'err');
      }
    }

    if (!navigator.geolocation) {
      reportScan(null);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => reportScan({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        () => {
          setStatus('Location permission was not granted &mdash; notifying the owner with an approximate location instead.');
          reportScan(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  </script>
</body>
</html>`;
}
