/**
 * Types for @a3stack/accounts
 */

export interface CdpCredentials {
  /** CDP API Key ID */
  apiKeyId: string;
  /** CDP API Key Secret */
  apiKeySecret: string;
  /** CDP Wallet Secret (EC P-256 PKCS8 key, base64-encoded) */
  walletSecret: string;
}

export interface CreateAgentAccountOptions {
  /** Human-readable name for the account (used for idempotent getOrCreate) */
  name?: string;
  /** Use testnet (Base Sepolia) instead of mainnet */
  testnet?: boolean;
}

export interface AgentAccount {
  /** Smart account address (ERC-4337) */
  address: `0x${string}`;
  /** Owner EOA address */
  ownerAddress: `0x${string}`;
  /** The network used */
  network: "base" | "base-sepolia";
  /** Send a gasless UserOperation */
  sendUserOperation: (calls: UserOperationCall[]) => Promise<UserOperationResult>;
  /** Register this agent on ERC-8004 with zero gas */
  register: (options: RegisterOptions) => Promise<RegisterResult>;
}

export interface UserOperationCall {
  to: `0x${string}`;
  value?: bigint;
  data?: `0x${string}`;
}

export interface UserOperationResult {
  userOpHash: string;
  transactionHash: string;
}

export interface RegisterOptions {
  /** Agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent image URL (optional) */
  image?: string;
  /** Service endpoints */
  services?: Array<{ type: string; url: string }>;
  /** Whether agent supports x402 payments */
  x402Support?: boolean;
  /** Existing registrations from other chains */
  existingRegistrations?: Array<{
    agentId: number;
    agentRegistry: string;
  }>;
}

export interface RegisterResult {
  /** Transaction hash on Base */
  transactionHash: string;
  /** UserOperation hash */
  userOpHash: string;
  /** Smart account address */
  smartAccountAddress: `0x${string}`;
  /** Network used */
  network: string;
  /** Gas cost to user (always 0 with Paymaster) */
  gasCost: number;
  /** Whether gas was sponsored */
  sponsored: boolean;
}
