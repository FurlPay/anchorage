import type { AnchorageWebhookEvent, WebhookEventType } from "./types.js";
/** Configuration for webhook verification. */
export interface WebhookVerifierConfig {
    /** Anchorage's webhook signing public key in PEM format. */
    signingPublicKey: string;
    /** Maximum age of a webhook event in seconds. Default: 300. */
    maxAgeSecs?: number;
}
/** Result of webhook verification. */
export interface WebhookVerifyResult {
    valid: boolean;
    event?: AnchorageWebhookEvent;
    reason?: string;
}
/**
 * Verify and parse an incoming Anchorage webhook event.
 *
 * Checks:
 *   1. The payload is valid JSON with required fields.
 *   2. The Ed25519 signature matches the payload.
 *   3. The event is not too old (replay protection).
 *
 * @param rawBody   - The raw HTTP request body as a string.
 * @param signature - The signature from the `X-Anchorage-Signature` header.
 * @param config    - Verification configuration.
 * @returns Verification result with the parsed event on success.
 */
export declare function verifyWebhook(rawBody: string, signature: string, config: WebhookVerifierConfig): WebhookVerifyResult;
/**
 * Simple in-memory event deduplicator.
 *
 * Tracks seen eventIds and returns false for duplicates. In production, use
 * Redis or a database for deduplication across instances.
 */
export declare class EventDeduplicator {
    private readonly seen;
    private readonly maxSize;
    constructor(maxSize?: number);
    /**
     * Record an event as seen. Returns true if this is the first time,
     * false if it's a duplicate.
     */
    isDuplicate(eventId: string): boolean;
}
/** Map of event type to handler function. */
export type WebhookHandlers = Partial<Record<WebhookEventType, (event: AnchorageWebhookEvent) => void | Promise<void>>>;
/**
 * Dispatch a verified webhook event to the appropriate handler.
 *
 * @param event    - The verified webhook event.
 * @param handlers - Map of event type to handler function.
 * @returns True if a handler was found and executed.
 */
export declare function dispatchWebhook(event: AnchorageWebhookEvent, handlers: WebhookHandlers): Promise<boolean>;
