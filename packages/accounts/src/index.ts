/**
 * @a3stack/accounts — Gasless smart accounts for AI agents
 * 
 * Create ERC-4337 smart accounts with automatic gas sponsorship
 * via CDP Paymaster. Register agents on ERC-8004 with zero gas cost.
 * 
 * @example
 * ```ts
 * import { createAgentAccount } from "@a3stack/accounts";
 * 
 * const agent = await createAgentAccount({
 *   apiKeyId: process.env.CDP_API_KEY_ID!,
 *   apiKeySecret: process.env.CDP_API_KEY_SECRET!,
 *   walletSecret: process.env.CDP_WALLET_SECRET!,
 * });
 * 
 * // Register on-chain with zero gas
 * const result = await agent.register({
 *   name: "My Agent",
 *   description: "Does cool stuff",
 * });
 * ```
 */

export { createAgentAccount } from "./smart-account.js";
export { gaslessRegister } from "./gasless-register.js";
export { REGISTRY_ADDRESS, REGISTRY_ABI, REGISTRATION_TYPE } from "./constants.js";
export type {
  CdpCredentials,
  CreateAgentAccountOptions,
  AgentAccount,
  RegisterOptions,
  RegisterResult,
  UserOperationCall,
  UserOperationResult,
} from "./types.js";
