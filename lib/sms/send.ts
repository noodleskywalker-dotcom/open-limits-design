import "server-only";

type SmsResult = {
  sent: boolean;
  reason?: string;
};

/**
 * Twilio-backed SMS sender with a safe fallback.
 * If Twilio environment variables are missing, the booking workflow keeps
 * working and we simply log that SMS is not configured.
 */
export async function sendSms(to: string | null | undefined, body: string): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log("[sms] Twilio not configured — skipping SMS:", body);
    return { sent: false, reason: "Twilio not configured" };
  }

  if (!to) {
    console.log("[sms] No recipient phone number — skipping SMS");
    return { sent: false, reason: "No recipient phone number" };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ To: to, From: fromNumber, Body: body })
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("[sms] Twilio error:", detail.slice(0, 300));
      return { sent: false, reason: `Twilio error ${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    console.error("[sms] Send failed:", error instanceof Error ? error.message : error);
    return { sent: false, reason: "Network error" };
  }
}

export function bookingConfirmedMessage(date: string, time: string) {
  return `Your meeting with OPEN LIMITS DESIGN has been confirmed for ${date} at ${time}.`;
}

export function bookingRejectedMessage() {
  return "Your meeting request with OPEN LIMITS DESIGN could not be confirmed. Please choose another date.";
}
