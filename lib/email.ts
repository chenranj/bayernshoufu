import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  'SHOUFU JERSEY <noreply@shoufujersey.com>';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://bayernshoufu.com';

// =============================================================================
// BUYER: SELLER COUNTER OFFER EMAIL
// =============================================================================

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

  const formattedAmount = formatCurrency(amount);
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

// =============================================================================
// ADMIN: NEW OFFER EMAIL
// =============================================================================

type SendNewOfferAdminEmailParams = {
  jerseyName: string;
  amount: number;
  buyerEmail?: string | null;
  message?: string | null;
};

export async function sendNewOfferAdminEmail({
  jerseyName,
  amount,
  buyerEmail,
  message,
}: SendNewOfferAdminEmailParams) {
  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!process.env.RESEND_API_KEY) {
    console.error(
      '[sendNewOfferAdminEmail] RESEND_API_KEY is not configured'
    );
    return;
  }

  if (!adminEmail) {
    console.error(
      '[sendNewOfferAdminEmail] ADMIN_NOTIFICATION_EMAIL is not configured'
    );
    return;
  }

  const formattedAmount = formatCurrency(amount);
  const adminOffersUrl = `${SITE_URL}/admin/offers`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `New offer received — ${formattedAmount}`,
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
                          NEW OFFER
                        </div>

                        <h1
                          style="
                            margin:0 0 20px 0;
                            font-size:28px;
                            line-height:1.2;
                            font-weight:700;
                          "
                        >
                          New offer received.
                        </h1>

                        <p
                          style="
                            margin:0 0 24px 0;
                            font-size:15px;
                            line-height:1.7;
                            color:#444444;
                          "
                        >
                          A buyer submitted an offer for
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
                            OFFER AMOUNT
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
                          buyerEmail
                            ? `
                              <div
                                style="
                                  margin-bottom:20px;
                                  font-size:14px;
                                  line-height:1.6;
                                "
                              >
                                <strong>Buyer:</strong>
                                ${escapeHtml(buyerEmail)}
                              </div>
                            `
                            : ''
                        }

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
                                  MESSAGE FROM BUYER
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
                          Open Admin Offers to review, accept, counter,
                          or decline this offer.
                        </p>

                        <a
                          href="${adminOffersUrl}"
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
                          VIEW OFFER
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
                        Admin offer notification.
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
        '[sendNewOfferAdminEmail] Resend error',
        error
      );
    }
  } catch (error) {
    console.error(
      '[sendNewOfferAdminEmail] unexpected error',
      error
    );
  }
}
// =============================================================================
// ADMIN: BUYER COUNTER OFFER EMAIL
// =============================================================================

type SendBuyerCounterAdminEmailParams = {
  jerseyName: string;
  amount: number;
  buyerEmail?: string | null;
  message?: string | null;
};

export async function sendBuyerCounterAdminEmail({
  jerseyName,
  amount,
  buyerEmail,
  message,
}: SendBuyerCounterAdminEmailParams) {
  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!process.env.RESEND_API_KEY) {
    console.error(
      '[sendBuyerCounterAdminEmail] RESEND_API_KEY is not configured'
    );
    return;
  }

  if (!adminEmail) {
    console.error(
      '[sendBuyerCounterAdminEmail] ADMIN_NOTIFICATION_EMAIL is not configured'
    );
    return;
  }

  const formattedAmount = formatCurrency(amount);
  const adminOffersUrl = `${SITE_URL}/admin/offers`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `Buyer countered — ${formattedAmount}`,
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
                          BUYER COUNTER OFFER
                        </div>

                        <h1
                          style="
                            margin:0 0 20px 0;
                            font-size:28px;
                            line-height:1.2;
                            font-weight:700;
                          "
                        >
                          The buyer sent a counter offer.
                        </h1>

                        <p
                          style="
                            margin:0 0 24px 0;
                            font-size:15px;
                            line-height:1.7;
                            color:#444444;
                          "
                        >
                          The buyer has responded to your counter offer
                          for
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
                            BUYER COUNTER OFFER
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
                          buyerEmail
                            ? `
                              <div
                                style="
                                  margin-bottom:20px;
                                  font-size:14px;
                                  line-height:1.6;
                                "
                              >
                                <strong>Buyer:</strong>
                                ${escapeHtml(buyerEmail)}
                              </div>
                            `
                            : ''
                        }

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
                                  MESSAGE FROM BUYER
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
                          Open Admin Offers to review the buyer's new
                          amount. You can accept, counter, or decline
                          the offer.
                        </p>

                        <a
                          href="${adminOffersUrl}"
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
                          VIEW OFFER
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
                        Admin offer notification.
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
        '[sendBuyerCounterAdminEmail] Resend error',
        error
      );
    }
  } catch (error) {
    console.error(
      '[sendBuyerCounterAdminEmail] unexpected error',
      error
    );
  }
}
// =============================================================================
// BUYER: OFFER ACCEPTED EMAIL
// =============================================================================

type SendOfferAcceptedEmailParams = {
  to: string;
  jerseyName: string;
  acceptedAmount: number;
  paymentExpiresAt: string;
};

export async function sendOfferAcceptedEmail({
  to,
  jerseyName,
  acceptedAmount,
  paymentExpiresAt,
}: SendOfferAcceptedEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      '[sendOfferAcceptedEmail] RESEND_API_KEY is not configured'
    );
    return;
  }

  const formattedAmount =
    formatCurrency(acceptedAmount);

  const deadline = new Date(
    paymentExpiresAt
  ).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Toronto',
  });

  const accountUrl = `${SITE_URL}/account`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your offer has been accepted — ${formattedAmount}`,
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
                          OFFER ACCEPTED
                        </div>

                        <h1
                          style="
                            margin:0 0 20px 0;
                            font-size:28px;
                            line-height:1.2;
                            font-weight:700;
                          "
                        >
                          Your offer has been accepted.
                        </h1>

                        <p
                          style="
                            margin:0 0 24px 0;
                            font-size:15px;
                            line-height:1.7;
                            color:#444444;
                          "
                        >
                          Your offer for
                          <strong>${escapeHtml(jerseyName)}</strong>
                          has been accepted.
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
                            ACCEPTED AMOUNT
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
                            PAYMENT DEADLINE
                          </div>

                          <div
                            style="
                              font-size:17px;
                              font-weight:700;
                              line-height:1.5;
                            "
                          >
                            ${escapeHtml(deadline)}
                          </div>

                          <div
                            style="
                              margin-top:10px;
                              font-size:13px;
                              line-height:1.6;
                              color:#555555;
                            "
                          >
                            Payment must be completed within 24 hours
                            of acceptance.
                          </div>
                        </div>

                        <p
                          style="
                            margin:0 0 26px 0;
                            font-size:14px;
                            line-height:1.7;
                            color:#555555;
                          "
                        >
                          If payment is not completed before the
                          deadline, this offer will expire
                          automatically.
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
                        This email was sent because your offer was
                        accepted through SHOUFU JERSEY.
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
        '[sendOfferAcceptedEmail] Resend error',
        error
      );
    }
  } catch (error) {
    console.error(
      '[sendOfferAcceptedEmail] unexpected error',
      error
    );
  }
}

// =============================================================================
// BUYER: OFFER DECLINED BY SELLER EMAIL
// =============================================================================

type SendOfferDeclinedEmailParams = {
  to: string;
  jerseyName: string;
  amount: number;
  message?: string | null;
};

export async function sendOfferDeclinedEmail({
  to,
  jerseyName,
  amount,
  message,
}: SendOfferDeclinedEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      '[sendOfferDeclinedEmail] RESEND_API_KEY is not configured'
    );
    return;
  }

  const formattedAmount = formatCurrency(amount);
  const accountUrl = `${SITE_URL}/account`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your offer was declined — ${formattedAmount}`,
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
                          OFFER DECLINED
                        </div>

                        <h1
                          style="
                            margin:0 0 20px 0;
                            font-size:28px;
                            line-height:1.2;
                            font-weight:700;
                          "
                        >
                          Your offer was declined.
                        </h1>

                        <p
                          style="
                            margin:0 0 24px 0;
                            font-size:15px;
                            line-height:1.7;
                            color:#444444;
                          "
                        >
                          The seller has declined your offer for
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
                            DECLINED OFFER
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
                          This negotiation has now ended. You can
                          review the offer history in your account.
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
                        This email was sent because the seller
                        declined your offer through SHOUFU JERSEY.
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
        '[sendOfferDeclinedEmail] Resend error',
        error
      );
    }
  } catch (error) {
    console.error(
      '[sendOfferDeclinedEmail] unexpected error',
      error
    );
  }
}

// =============================================================================
// ADMIN: OFFER DECLINED BY BUYER EMAIL
// =============================================================================

type SendBuyerDeclinedAdminEmailParams = {
  jerseyName: string;
  amount: number;
  buyerEmail?: string | null;
};

export async function sendBuyerDeclinedAdminEmail({
  jerseyName,
  amount,
  buyerEmail,
}: SendBuyerDeclinedAdminEmailParams) {
  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!process.env.RESEND_API_KEY) {
    console.error(
      '[sendBuyerDeclinedAdminEmail] RESEND_API_KEY is not configured'
    );
    return;
  }

  if (!adminEmail) {
    console.error(
      '[sendBuyerDeclinedAdminEmail] ADMIN_NOTIFICATION_EMAIL is not configured'
    );
    return;
  }

  const formattedAmount = formatCurrency(amount);
  const adminOffersUrl = `${SITE_URL}/admin/offers`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `Buyer declined offer — ${formattedAmount}`,
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
                          BUYER DECLINED
                        </div>

                        <h1
                          style="
                            margin:0 0 20px 0;
                            font-size:28px;
                            line-height:1.2;
                            font-weight:700;
                          "
                        >
                          The buyer declined the offer.
                        </h1>

                        <p
                          style="
                            margin:0 0 24px 0;
                            font-size:15px;
                            line-height:1.7;
                            color:#444444;
                          "
                        >
                          The buyer has declined the seller's offer
                          for
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
                            DECLINED AMOUNT
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
                          buyerEmail
                            ? `
                              <div
                                style="
                                  margin-bottom:24px;
                                  font-size:14px;
                                  line-height:1.6;
                                "
                              >
                                <strong>Buyer:</strong>
                                ${escapeHtml(buyerEmail)}
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
                          The negotiation has ended and the offer is
                          now marked as declined.
                        </p>

                        <a
                          href="${adminOffersUrl}"
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
                          VIEW OFFER
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
                        Admin offer notification.
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
        '[sendBuyerDeclinedAdminEmail] Resend error',
        error
      );
    }
  } catch (error) {
    console.error(
      '[sendBuyerDeclinedAdminEmail] unexpected error',
      error
    );
  }
}

// =============================================================================
// ADMIN: BUYER ACCEPTED SELLER COUNTER EMAIL
// =============================================================================

type SendBuyerAcceptedAdminEmailParams = {
  jerseyName: string;
  amount: number;
  buyerEmail?: string | null;
  paymentExpiresAt?: string | null;
};

export async function sendBuyerAcceptedAdminEmail({
  jerseyName,
  amount,
  buyerEmail,
  paymentExpiresAt,
}: SendBuyerAcceptedAdminEmailParams) {
  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!process.env.RESEND_API_KEY) {
    console.error(
      '[sendBuyerAcceptedAdminEmail] RESEND_API_KEY is not configured'
    );
    return;
  }

  if (!adminEmail) {
    console.error(
      '[sendBuyerAcceptedAdminEmail] ADMIN_NOTIFICATION_EMAIL is not configured'
    );
    return;
  }

  const formattedAmount = formatCurrency(amount);
  const adminOffersUrl = `${SITE_URL}/admin/offers`;

  const deadline = paymentExpiresAt
    ? new Date(paymentExpiresAt).toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'America/Toronto',
      })
    : null;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `Buyer accepted counter offer — ${formattedAmount}`,
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
                          BUYER ACCEPTED
                        </div>

                        <h1
                          style="
                            margin:0 0 20px 0;
                            font-size:28px;
                            line-height:1.2;
                            font-weight:700;
                          "
                        >
                          The buyer accepted your counter offer.
                        </h1>

                        <p
                          style="
                            margin:0 0 24px 0;
                            font-size:15px;
                            line-height:1.7;
                            color:#444444;
                          "
                        >
                          The buyer has accepted the seller counter
                          offer for
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
                            ACCEPTED AMOUNT
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
                          buyerEmail
                            ? `
                              <div
                                style="
                                  margin-bottom:20px;
                                  font-size:14px;
                                  line-height:1.6;
                                "
                              >
                                <strong>Buyer:</strong>
                                ${escapeHtml(buyerEmail)}
                              </div>
                            `
                            : ''
                        }

                        ${
                          deadline
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
                                  PAYMENT DEADLINE
                                </div>

                                <div
                                  style="
                                    font-size:17px;
                                    font-weight:700;
                                    line-height:1.5;
                                  "
                                >
                                  ${escapeHtml(deadline)}
                                </div>

                                <div
                                  style="
                                    margin-top:10px;
                                    font-size:13px;
                                    line-height:1.6;
                                    color:#555555;
                                  "
                                >
                                  The buyer now has 24 hours to
                                  complete payment.
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
                          The offer is now accepted and the payment
                          window has started.
                        </p>

                        <a
                          href="${adminOffersUrl}"
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
                          VIEW OFFER
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
                        Admin offer notification.
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
        '[sendBuyerAcceptedAdminEmail] Resend error',
        error
      );
    }
  } catch (error) {
    console.error(
      '[sendBuyerAcceptedAdminEmail] unexpected error',
      error
    );
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(amount: number) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
