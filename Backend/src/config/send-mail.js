const { Resend } = require("resend");

const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_API;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const isDev = process.env.NODE_ENV !== "production";

const sendEmail = async (to, subject, html) => {
  if (!resend) {
    console.log(`[Email Simulation - No Resend API Key] Sent to ${to} (${subject})`);

    return { delivered: false, simulated: true };
  }

  try {
    const from = process.env.RESEND_FROM || "onboarding@resend.dev";

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[Resend API Error]:", error);

      const isSandboxRestriction =
        error.statusCode === 403 ||
        error.message?.includes(
          "You can only send testing emails to your own email address"
        );

      if (isDev && isSandboxRestriction) {
        console.warn(`[Resend Sandbox Restriction]: ${error.message}`);

        return {
          delivered: false,
          simulated: true,
          reason: error.message,
          sandboxBlocked: true,
        };
      }

      throw new Error(error.message || "Resend email delivery failed");
    }

    console.log(`[Email Delivered via Resend] Sent to ${to}. ID: ${data?.id}`);

    return {
      delivered: true,
      provider: "resend",
      data,
    };
  } catch (resendErr) {
    console.error("[Resend Error]:", resendErr.message);

    throw resendErr;
  }
};

module.exports = sendEmail;