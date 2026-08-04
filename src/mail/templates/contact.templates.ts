const NAVY = "#0f1642";
const BLUE = "#3b6df0";
const MINT = "#12b76a";
const MINT_BG = "#eafbf1";
const MUTED = "#68708b";
const BORDER = "#e6e9f5";
const PAGE_BG = "#eef1fb";
const BADGE_BG = "#eef1fb";
const LOGO_URL = "https://www.macropage.in/macropage-logo-1.svg";
const CONNECT_URL = "https://www.macropage.in/work/macropage-connect";

// Gmail strips inline <svg>, so every icon here is plain text/emoji —
// the one thing that reliably renders across Gmail, Outlook, and Apple Mail.

const badgeCell = (emoji: string, label: string) => `
  <td style="padding:0 6px 8px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="background:${BADGE_BG}; border-radius:999px; padding:8px 14px; font-size:12px; font-weight:700; color:${NAVY}; white-space:nowrap;">
        <span style="margin-right:6px; font-size:13px;">${emoji}</span>${label}
      </td>
    </tr></table>
  </td>
`;

const badgeRow = (items: Array<[string, string]>) =>
  `<tr>${items.map(([emoji, label]) => badgeCell(emoji, label)).join("")}</tr>`;

const featureBadges = `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
    ${badgeRow([
      ["✈️", "Bulk Campaigns"],
      ["👥", "Team Inbox"],
      ["✨", "AI Automation"],
    ])}
    ${badgeRow([
      ["📊", "Smart Analytics"],
      ["🔗", "Integrations"],
    ])}
  </table>
`;

const connectPromo = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px; background:${MINT_BG}; border-radius:14px;">
    <tr>
      <td style="padding:26px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top">
              <p style="margin:0 0 8px; font-size:11px; font-weight:800; letter-spacing:0.08em; color:${MINT}; text-transform:uppercase;">Also from MacroPage</p>
              <p style="margin:0 0 6px; font-size:16px; font-weight:800; color:${NAVY};">Automate WhatsApp with MacroPage Connect</p>
              <p style="margin:0 0 18px; font-size:13px; line-height:1.6; color:${MUTED};">
                We integrate the WhatsApp Business API into your CRM, alerts, and support flows end-to-end.
              </p>
              <a href="${CONNECT_URL}" style="display:inline-block; background:${NAVY}; color:#ffffff; font-size:13px; font-weight:700; text-decoration:none; padding:11px 20px; border-radius:8px;">See MacroPage Connect &rarr;</a>
            </td>
            <td width="56" valign="top" align="right">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:52px; height:52px; background:${MINT}; border-radius:50%;">
                <tr><td align="center" style="font-size:24px; line-height:52px; text-align:center;">&#128172;</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${featureBadges}
`;

const wrapper = (preheader: string, body: string) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MacroPage</title>
  </head>
  <body style="margin:0; padding:0; background:${PAGE_BG}; font-family: 'DM Sans', Helvetica, Arial, sans-serif;">
    <span style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG}; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%; background:#ffffff; border:1px solid ${BORDER}; border-radius:18px; overflow:hidden;">
            <tr>
              <td style="background:#ffffff; padding:24px 32px; border-bottom:1px solid ${BORDER};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="middle">
                      <img src="${LOGO_URL}" width="210" height="118" alt="MacroPage" style="display:block; height:118px; width:210px; max-width:210px; border:0;" />
                    </td>
                    <td align="right" valign="middle" style="font-size:44px; line-height:1;">&#9993;&#65039;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 28px;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; border-top:1px solid ${BORDER};">
                <p style="margin:0; font-size:12px; color:${MUTED};">
                  <strong style="color:${NAVY};">MacroPage</strong> &middot; This is an automated message, please don't reply directly.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export function otpEmailTemplate({ name, otp }: { name: string; otp: string }): string {
  const digits = otp
    .split("")
    .map(
      (d) =>
        `<td style="width:40px; height:52px; background:#f4f6ff; border:1px solid ${BORDER}; border-radius:10px; font-size:24px; font-weight:800; color:${NAVY}; text-align:center;">${d}</td>`,
    )
    .join(`<td style="width:6px;"></td>`);

  const body = `
    <h1 style="margin:0 0 20px; font-size:26px; font-weight:800; color:${NAVY}; line-height:1.2;">Verify your <span style="color:${BLUE};">email</span></h1>
    <p style="margin:0 0 4px; font-size:14px; line-height:1.6; color:${MUTED};">Hi <strong style="color:${BLUE};">${name}</strong>,</p>
    <p style="margin:0 0 28px; font-size:14px; line-height:1.6; color:${MUTED};">
      Use the code below to submit your message to MacroPage. It expires in <strong style="color:${NAVY};">5 minutes</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
      <tr>${digits}</tr>
    </table>
    <p style="margin:0; font-size:13px; color:${MUTED}; text-align:center;">
      <span style="color:${MINT}; font-weight:900; margin-right:6px;">&#10003;</span>Didn't request this? You can safely ignore this email.
    </p>
    ${connectPromo}
  `;

  return wrapper(`Your MacroPage verification code is ${otp}`, body);
}

export function contactNotificationTemplate({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}): string {
  const body = `
    <h1 style="margin:0 0 20px; font-size:24px; font-weight:800; color:${NAVY}; line-height:1.2;">New contact form <span style="color:${BLUE};">submission</span></h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:4px 0; font-size:13px; color:${MUTED}; width:80px;">Name</td>
        <td style="padding:4px 0; font-size:14px; color:${NAVY}; font-weight:600;">${name}</td>
      </tr>
      <tr>
        <td style="padding:4px 0; font-size:13px; color:${MUTED};">Email</td>
        <td style="padding:4px 0; font-size:14px; color:${NAVY}; font-weight:600;">
          <a href="mailto:${email}" style="color:${BLUE}; text-decoration:none;">${email}</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px; font-size:13px; color:${MUTED};">Message</p>
    <p style="margin:0; white-space:pre-wrap; background:#f4f6ff; border:1px solid ${BORDER}; border-radius:10px; padding:16px; font-size:14px; line-height:1.6; color:${NAVY};">${message}</p>
  `;

  return wrapper(`New inquiry from ${name}`, body);
}
