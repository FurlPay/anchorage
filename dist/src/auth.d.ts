/**
 * Build the canonical request string that Anchorage expects to be signed.
 *
 * Format: `METHOD\nPATH\nTIMESTAMP\nBODY_HASH`
 *
 * - METHOD: uppercase HTTP method (GET, POST, etc.)
 * - PATH: request path including query string (e.g. "/v2/vaults?limit=10")
 * - TIMESTAMP: Unix timestamp in seconds (same as Api-Timestamp header)
 * - BODY_HASH: SHA-256 hex digest of the request body, or empty string for
 *   bodiless requests
 */
export declare function canonicalRequest(method: string, path: string, timestamp: number, body?: string | Buffer): string;
/**
 * Sign a canonical request string with an Ed25519 private key.
 *
 * @param canonical   - The canonical request string from `canonicalRequest()`.
 * @param privateKey  - Ed25519 private key in PEM format.
 * @returns Base64-encoded Ed25519 signature.
 */
export declare function signCanonical(canonical: string, privateKey: string): string;
/**
 * Verify an Ed25519 signature over a canonical request.
 *
 * Used for webhook verification and for testing request signing.
 *
 * @param canonical  - The canonical request string.
 * @param signature  - Base64-encoded Ed25519 signature.
 * @param publicKey  - Ed25519 public key in PEM format.
 * @returns True if the signature is valid.
 */
export declare function verifyCanonical(canonical: string, signature: string, publicKey: string): boolean;
/**
 * Generate the authentication headers for an Anchorage API request.
 *
 * @param method     - HTTP method.
 * @param path       - Request path (including query string).
 * @param apiKey     - Anchorage API access key.
 * @param privateKey - Ed25519 private key in PEM format.
 * @param body       - Request body (if any).
 * @returns Headers to include in the request.
 */
export declare function authHeaders(method: string, path: string, apiKey: string, privateKey: string, body?: string | Buffer): Record<string, string>;
