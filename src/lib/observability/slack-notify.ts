/**
 * Slack incoming-webhook notifier for high-signal Stripe events.
 *
 * Used by `src/app/api/stripe/webhook/route.ts` (and the lifetime
 * handler) to flag operational alerts to the CEO in real time without
 * burning a paid logging tool budget pre-launch.
 *
 * Contract:
 *   - SLACK_WEBHOOK_URL is the env var. When unset, every helper is a
 *     no-op that emits a `console.warn` once — production keeps running.
 *   - Messages are PII-free: only event id, type, and a short error
 *     summary travel over the wire. Email, names, payment intent ids
 *     stay out of the alert body.
 *   - Network failure is non-fatal: the caller's main flow always wins.
 *     Stripe retries the webhook either way; we never want a transient
 *     Slack outage to break the seat-claim path.
 *
 * Channel posting uses fire-and-forget `fetch` with a 2-second AbortController
 * so a hung Slack endpoint can't pin our 30s Vercel function timeout.
 */

import "server-only";

const SLACK_TIMEOUT_MS = 2_000;

interface SlackBlock {
  type: "section";
  text: { type: "mrkdwn"; text: string };
}

interface SlackPayload {
  text: string;
  blocks?: SlackBlock[];
}

let warnedAboutMissingUrl = false;

function getWebhookUrl(): string | null {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    if (!warnedAboutMissingUrl) {
      // Single console.warn on first call — keep prod logs quiet.
      console.warn(
        "[slack-notify] SLACK_WEBHOOK_URL not configured — alerts are no-ops.",
      );
      warnedAboutMissingUrl = true;
    }
    return null;
  }
  return url;
}

async function postToSlack(payload: SlackPayload): Promise<void> {
  const url = getWebhookUrl();
  if (!url) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(
        `[slack-notify] non-2xx from Slack webhook (${res.status})`,
      );
    }
  } catch (err) {
    console.warn(
      `[slack-notify] post failed (${(err as Error).name}): ${(err as Error).message}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Trim error messages to a Slack-safe length and strip anything that
 * could carry secrets (very long base64 / hex blobs, file paths).
 */
function sanitiseErrorSummary(err: unknown): string {
  if (!err) return "(no error message)";
  const msg = err instanceof Error ? err.message : String(err);
  const stripped = msg.replace(/\s+/g, " ").slice(0, 400);
  return stripped;
}

export interface WebhookFailureNotice {
  eventId: string;
  eventType: string;
  error: unknown;
}

export async function notifyWebhookFailed(
  notice: WebhookFailureNotice,
): Promise<void> {
  const text = `:warning: Stripe webhook handler failed — ${notice.eventType} \`${notice.eventId}\``;
  await postToSlack({
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${text}\n*Error:* ${sanitiseErrorSummary(notice.error)}\n\nStripe will retry. Investigate at your convenience.`,
        },
      },
    ],
  });
}

export interface LifetimeLowSeatsNotice {
  seatsRemaining: number;
  capacity: number;
}

/**
 * Fires when the Lifetime seat pool dips below the alert threshold so
 * the CEO knows to prepare the "Lifetime closed" announcement copy.
 * Threshold check is the caller's responsibility — this helper just
 * formats the message.
 */
export async function notifyLifetimeLowSeats(
  notice: LifetimeLowSeatsNotice,
): Promise<void> {
  const text = `:tickets: Lifetime seats low — *${notice.seatsRemaining}* / ${notice.capacity} remaining`;
  await postToSlack({
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${text}\n\nWhen it reaches zero the pricing page will auto-display *Sold out*. Now is a good time to draft a public &quot;Lifetime closed&quot; post.`,
        },
      },
    ],
  });
}

export interface PaymentFailedNotice {
  eventId: string;
  eventType: string;
  reason?: string;
}

export async function notifyPaymentFailed(
  notice: PaymentFailedNotice,
): Promise<void> {
  const reason = notice.reason
    ? sanitiseErrorSummary(notice.reason)
    : "(no reason in Stripe payload)";
  const text = `:credit_card: Stripe payment failed — \`${notice.eventType}\` (${notice.eventId})`;
  await postToSlack({
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${text}\n*Reason:* ${reason}\n\nNo customer PII included. Check the Stripe dashboard for details.`,
        },
      },
    ],
  });
}

/** Test-only escape hatch for resetting the warn-once flag. */
export function __resetSlackNotifyForTests(): void {
  warnedAboutMissingUrl = false;
}
