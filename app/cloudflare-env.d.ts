declare namespace Cloudflare {
  interface Env {
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    AI_FREE_TIER_CONFIRMED?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
    PAYPAL_CLIENT_ID?: string;
    PAYPAL_CLIENT_SECRET?: string;
    PAYPAL_WEBHOOK_ID?: string;
    PAYPAL_WEBHOOK_RECEIVER_MODE?: string;
    PAYPAL_INBOX_ORIGIN?: string;
    PAYPAL_INBOX_SYNC_KEY?: string;
  }
}
