// ---------------------------------------------------------------------------
// Anchorage Digital REST API client.
//
// PROPOSED INTEGRATION — requires Anchorage institutional onboarding. This
// client is built from Anchorage's public API documentation. The actual
// endpoint paths and request/response schemas may differ.
//
// Uses native fetch() (Node 20+) and node:crypto for Ed25519 request signing.
// Zero runtime dependencies.
// ---------------------------------------------------------------------------
import { authHeaders } from "./auth.js";
// ── Retry helper ────────────────────────────────────────────────────────────
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
async function fetchWithRetry(url, init, maxRetries, timeoutMs) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(url, { ...init, signal: controller.signal });
            clearTimeout(timer);
            if (res.ok || !RETRYABLE_STATUSES.has(res.status))
                return res;
            lastError = new Error(`HTTP ${res.status}: ${await res.text()}`);
        }
        catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
        }
        if (attempt < maxRetries) {
            const delay = 200 * Math.pow(2, attempt) + Math.random() * 100;
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw lastError ?? new Error("Request failed after retries");
}
// ── Client ──────────────────────────────────────────────────────────────────
/**
 * Anchorage Digital REST API client.
 *
 * Provides typed methods for vault management, transfers, address book,
 * and compliance queries. All requests are authenticated with Ed25519
 * signatures per Anchorage's protocol.
 *
 * PROPOSED INTEGRATION — requires institutional onboarding with Anchorage
 * Digital. Code can be written and tested against mocks but not executed
 * without real credentials.
 */
export class AnchorageClient {
    apiKey;
    apiSecret;
    baseUrl;
    timeoutMs;
    maxRetries;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;
        this.baseUrl = (config.baseUrl ?? "https://api.anchorage.com").replace(/\/$/, "");
        this.timeoutMs = config.timeoutMs ?? 30_000;
        this.maxRetries = config.maxRetries ?? 3;
    }
    /** Create from environment variables. */
    static fromEnv() {
        const apiKey = process.env.ANCHORAGE_API_KEY;
        const apiSecret = process.env.ANCHORAGE_API_SECRET;
        if (!apiKey || !apiSecret) {
            throw new Error("AnchorageClient: ANCHORAGE_API_KEY and ANCHORAGE_API_SECRET must be set");
        }
        return new AnchorageClient({
            apiKey,
            apiSecret,
            baseUrl: process.env.ANCHORAGE_BASE_URL,
        });
    }
    /** Make an authenticated request. */
    async request(method, path, body) {
        const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;
        const headers = authHeaders(method, path, this.apiKey, this.apiSecret, bodyStr);
        const url = `${this.baseUrl}${path}`;
        const init = {
            method,
            headers: {
                ...headers,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            ...(bodyStr ? { body: bodyStr } : {}),
        };
        const res = await fetchWithRetry(url, init, this.maxRetries, this.timeoutMs);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Anchorage API error (${res.status} ${method} ${path}): ${text}`);
        }
        if (res.status === 204)
            return undefined;
        return (await res.json());
    }
    // ── Vaults ────────────────────────────────────────────────────────────
    /** List all vaults. */
    async listVaults() {
        const res = await this.request("GET", "/v2/vaults");
        return res.vaults;
    }
    /** Get a specific vault by id. */
    async getVault(vaultId) {
        return this.request("GET", `/v2/vaults/${encodeURIComponent(vaultId)}`);
    }
    /** Get the balances for a specific vault. */
    async getVaultBalances(vaultId) {
        return this.request("GET", `/v2/vaults/${encodeURIComponent(vaultId)}/balances`);
    }
    // ── Transfers ─────────────────────────────────────────────────────────
    /**
     * Initiate a transfer from a vault.
     *
     * The `externalId` field is an idempotency key — safe to retry on network
     * errors. Anchorage deduplicates requests with the same externalId.
     */
    async createTransfer(req) {
        return this.request("POST", "/v2/transfers", req);
    }
    /** Get the status of a transfer. */
    async getTransfer(transferId) {
        return this.request("GET", `/v2/transfers/${encodeURIComponent(transferId)}`);
    }
    /** List recent transfers, optionally filtered by vault. */
    async listTransfers(opts) {
        const params = new URLSearchParams();
        if (opts?.vaultId)
            params.set("vaultId", opts.vaultId);
        if (opts?.status)
            params.set("status", opts.status);
        if (opts?.limit)
            params.set("limit", String(opts.limit));
        if (opts?.offset)
            params.set("offset", String(opts.offset));
        const qs = params.toString();
        return this.request("GET", `/v2/transfers${qs ? "?" + qs : ""}`);
    }
    /** Cancel a pending transfer (only possible before approval). */
    async cancelTransfer(transferId) {
        return this.request("POST", `/v2/transfers/${encodeURIComponent(transferId)}/cancel`);
    }
    /**
     * Poll a transfer until it reaches a terminal state.
     *
     * @param transferId    - Transfer id from createTransfer().
     * @param pollIntervalMs - How often to poll. Default 2000ms.
     * @param maxWaitMs     - Maximum wait time. Default 300000ms (5 min).
     */
    async waitForTransfer(transferId, pollIntervalMs = 2000, maxWaitMs = 300_000) {
        const deadline = Date.now() + maxWaitMs;
        const terminalStates = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
        while (Date.now() < deadline) {
            const result = await this.getTransfer(transferId);
            if (terminalStates.has(result.status)) {
                if (result.status === "FAILED") {
                    throw new Error(`Transfer failed: ${result.error ?? "unknown error"}`);
                }
                return result;
            }
            await new Promise((r) => setTimeout(r, pollIntervalMs));
        }
        throw new Error(`Transfer timed out after ${maxWaitMs}ms`);
    }
    // ── Address book ──────────────────────────────────────────────────────
    /** List trusted addresses. */
    async listAddresses() {
        const res = await this.request("GET", "/v2/addresses");
        return res.addresses;
    }
    /** Add a trusted address. */
    async addAddress(addr) {
        return this.request("POST", "/v2/addresses", addr);
    }
    /** Remove a trusted address. */
    async removeAddress(addressId) {
        await this.request("DELETE", `/v2/addresses/${encodeURIComponent(addressId)}`);
    }
    // ── Compliance ────────────────────────────────────────────────────────
    /** Get the organization's compliance status. */
    async getComplianceStatus() {
        return this.request("GET", "/v2/compliance/status");
    }
    // ── Health ────────────────────────────────────────────────────────────
    /** Check if the Anchorage API is reachable. */
    async healthCheck() {
        try {
            await this.request("GET", "/v2/health");
            return true;
        }
        catch {
            return false;
        }
    }
}
