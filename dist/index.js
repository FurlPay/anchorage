// ---------------------------------------------------------------------------
// @furlpay/anchorage — barrel exports
// ---------------------------------------------------------------------------
// Ed25519 request signing
export { canonicalRequest, signCanonical, verifyCanonical, authHeaders, } from "./src/auth.js";
// REST client
export { AnchorageClient } from "./src/client.js";
// Webhook verification
export { verifyWebhook, EventDeduplicator, dispatchWebhook, } from "./src/webhooks.js";
