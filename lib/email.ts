import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'SHOUFU JERSEY <noreply@shoufujersey.com>';
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://bayernshoufu.com';

type SendOfferCounterEmailParams = {
  to: string;
  jerseyName: string;
  amount: number;
  message?: string | null;
};

export async function sendOfferCounterEmail({
  to,
  jerseyName,
  amount,
  message,
}: SendOfferCounterEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      '[sendOfferCounterEmail] RESEND_API_KEY is not configured'
    );
    return;
  }

  const formattedAmount = amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const accountUrl = `${SITE_URL}/account`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Counter offer received — ${formattedAmount}`,
      html: `
        <!doctype html>
        <html>
          <body
            style="
              margin:0;
              padding:0;
              background:#f5f5f5;
              font-family:Arial,Helvetica,sans-serif;
              color:#111111;
            "
          >
            <table
              role="presentation"
              width="100%"
              cellspacing="0"
              cellpadding="0"
              border="0"
              style="background:#f5f5f5;padding:40px 16px;"
            >
              <tr>
                <td align="center">
                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                      max-width:600px;
                      background:#ffffff;
                      border:1px solid #e5e5e5;
                    "
                  >
                    <tr>
                      <td style="padding:36px 36px 20px 36px;">
                        <div
                          style="
                            font-size:22px;
                            font-weight:700;
                            letter-spacing:1px;
                          "
                        >
                          SHOUFU JERSEY®
                        </div>

                        <div
                          style="
                            margin-top:6px;
                            font-size:11px;
                            letter-spacing:2px;
                            color:#777777;
                          "
                        >
                          PRIVATE ARCHIVE • EST. 2021
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:12px 36px 36px 36px;">
                        <div
                          style="
                            font-size:12px;
                            letter-spacing:1.5px;
                            color:#777777;
                            margin-bottom:12px;
                          "
                        >
                          COUNTER OFFER
                        </div>

                        <h1
                          style="
                            margin:0 0 20px 0;
                            font-size:28px;
                            line-height:1.2;
                            font-weight:700;
                          "
                        >
                          You received a counter offer.
                        </h1>

                        <p
                          style="
                            margin:0 0 24px 0;
                            font-size:15px;
                            line-height:1.7;
                            color:#444444;
                          "
                        >
                          The seller has responded to your offer for
                          <strong>${escapeHtml(jerseyName)}</strong>.
                        </p>

                        <div
                          style="
                            border-top:1px solid #e5e5e5;
                            border-bottom:1px solid #e5e5e5;
                            padding:22px 0;
                            margin-bottom:24px;
                          "
                        >
                          <div
                            style="
                              font-size:11px;
                              letter-spacing:1.5px;
                              color:#777777;
                              margin-bottom:8px;
                            "
                          >
                            COUNTER OFFER
                          </div>

                          <div
                            style="
                              font-size:30px;
                              font-weight:700;
                            "
                          >
                            ${formattedAmount}
                          </div>
                        </div>

                        ${
                          message
                            ? `
                              <div
                                style="
                                  background:#f7f7f7;
                                  padding:18px;
                                  margin-bottom:24px;
                                "
                              >
                                <div
                                  style="
                                    font-size:11px;
                                    letter-spacing:1.5px;
                                    color:#777777;
                                    margin-bottom:8px;
                                  "
                                >
                                  MESSAGE FROM SELLER
                                </div>

                                <div
                                  style="
                                    font-size:14px;
                                    line-height:1.6;
                                  "
                                >
                                  ${escapeHtml(message)}
                                </div>
                              </div>
                            `
                            : ''
                        }

                        <p
                          style="
                            margin:0 0 26px 0;
                            font-size:14px;
                            line-height:1.7;
                            color:#555555;
                          "
                        >
                          Sign in to your account to review the counter
                          offer. You can accept it or submit another
                          counter offer.
                        </p>

                        <a
                          href="${accountUrl}"
                          style="
                            display:inline-block;
                            background:#111111;
                            color:#ffffff;
                            text-decoration:none;
                            padding:14px 24px;
                            font-size:12px;
                            font-weight:700;
                            letter-spacing:1.2px;
                          "
                        >
                          VIEW MY OFFER
                        </a>
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          border-top:1px solid #eeeeee;
                          padding:24px 36px;
                          font-size:11px;
                          line-height:1.6;
                          color:#888888;
                        "
                      >
                        SHOUFU JERSEY®<br />
                        This email was sent because you submitted an
                        offer through SHOUFU JERSEY.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error(
        '[sendOfferCounterEmail] Resend error',
        error
      );
    }
  } catch (error) {
    console.error(
      '[sendOfferCounterEmail] unexpected error',
      error
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
