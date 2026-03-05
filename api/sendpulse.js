
export default async function handler(req, res) {
  // -----------------------------
  // CORS (Webflow → Vercel)
  // -----------------------------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const payload = req.body || {};

    // Basic validation
    if (!payload.email) {
      return res.status(400).json({ error: "Missing required field: email" });
    }

    // -----------------------------
    // ENV Vars (Vercel dashboard me set honge)
    // -----------------------------
    const clientId = process.env.SENDPULSE_CLIENT_ID;
    const clientSecret = process.env.SENDPULSE_CLIENT_SECRET;

    // Your event URL (can be env too)
    const eventUrl =
      process.env.SENDPULSE_EVENT_URL ||
      "https://events.sendpulse.com/events/name/artsdao_member2_submitted";

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Missing SendPulse credentials in ENV" });
    }

    // -----------------------------
    // 1) Get OAuth token
    // -----------------------------
    const authRes = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    const authData = await authRes.json().catch(() => ({}));

    if (!authRes.ok || !authData.access_token) {
      return res.status(500).json({
        error: "Authentication failed",
        details: authData
      });
    }

    const accessToken = authData.access_token;

    // -----------------------------
    // 2) Send Event to SendPulse Events URL
    // -----------------------------
    const eventRes = await fetch(eventUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: payload.email,
        phone: payload.phone || "",
        telegram_handle: payload.telegram_handle || "",
        utm_source: payload.utm_source || "",
        customer_type: payload.customer_type || "",
        ScenarioType: payload.ScenarioType || "",
        deal_id: payload.deal_id || "",
        contact_id: payload.contact_id || "",
        first_name: payload.first_name || "",
        last_name: payload.last_name || "",
        country: payload.country || "",
        joint_split_payment: payload.joint_split_payment || ""
      })
    });

    const eventData = await eventRes.json().catch(() => ({}));

    if (!eventRes.ok) {
      return res.status(500).json({
        error: "Failed to send event to SendPulse",
        status: eventRes.status,
        details: eventData
      });
    }

    return res.status(200).json({
      message: "Event sent to SendPulse successfully",
      response: eventData
    });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error", details: String(err) });
  }
}
