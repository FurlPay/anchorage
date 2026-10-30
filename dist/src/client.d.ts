import type { AnchorageConfig, AnchorageVault, TransferRequest, TransferResult, TrustedAddress, ComplianceStatus } from "./types.js";
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
export declare class AnchorageClient {
    private readonly apiKey;
    private readonly apiSecret;
    private readonly baseUrl;
    private readonly timeoutMs;
    private readonly maxRetries;
    constructor(config: AnchorageConfig);
    /** Create from environment variables. */
    static fromEnv(): AnchorageClient;
    /** Make an authenticated request. */
    private request;
    /** List all vaults. */
    listVaults(): Promise<AnchorageVault[]>;
    /** Get a specific vault by id. */
    getVault(vaultId: string): Promise<AnchorageVault>;
    /** Get the balances for a specific vault. */
    getVaultBalances(vaultId: string): Promise<AnchorageVault>;
    /**
     * Initiate a transfer from a vault.
     *
     * The `externalId` field is an idempotency key — safe to retry on network
     * errors. Anchorage deduplicates requests with the same externalId.
     */
    createTransfer(req: TransferRequest): Promise<TransferResult>;
    /** Get the status of a transfer. */
    getTransfer(transferId: string): Promise<TransferResult>;
    /** List recent transfers, optionally filtered by vault. */
    listTransfers(opts?: {
        vaultId?: string;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        transfers: TransferResult[];
        total: number;
    }>;
    /** Cancel a pending transfer (only possible before approval). */
    cancelTransfer(transferId: string): Promise<TransferResult>;
    /**
     * Poll a transfer until it reaches a terminal state.
     *
     * @param transferId    - Transfer id from createTransfer().
     * @param pollIntervalMs - How often to poll. Default 2000ms.
     * @param maxWaitMs     - Maximum wait time. Default 300000ms (5 min).
     */
    waitForTransfer(transferId: string, pollIntervalMs?: number, maxWaitMs?: number): Promise<TransferResult>;
    /** List trusted addresses. */
    listAddresses(): Promise<TrustedAddress[]>;
    /** Add a trusted address. */
    addAddress(addr: Omit<TrustedAddress, "addressId" | "verified" | "createdAt">): Promise<TrustedAddress>;
    /** Remove a trusted address. */
    removeAddress(addressId: string): Promise<void>;
    /** Get the organization's compliance status. */
    getComplianceStatus(): Promise<ComplianceStatus>;
    /** Check if the Anchorage API is reachable. */
    healthCheck(): Promise<boolean>;
}
