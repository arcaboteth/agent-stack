/**
 * Convenience function for one-shot gasless registration.
 * 
 * For more control, use createAgentAccount() directly.
 */

import { createAgentAccount } from "./smart-account.js";
import type { CdpCredentials, RegisterOptions, RegisterResult } from "./types.js";

/**
 * Register an agent on ERC-8004 with zero gas cost (one-shot).
 * 
 * Creates a smart account and registers in a single call.
 * 
 * @example
 * ```ts
 * import { gaslessRegister } from "@a3stack/accounts";
 * 
 * const result = await gaslessRegister(
 *   {
 *     apiKeyId: process.env.CDP_API_KEY_ID!,
 *     apiKeySecret: process.env.CDP_API_KEY_SECRET!,
 *     walletSecret: process.env.CDP_WALLET_SECRET!,
 *   },
 *   {
 *     name: "my-agent",
 *     description: "An AI agent that does cool things",
 *     services: [{ type: "website", url: "https://myagent.ai" }],
 *   }
 * );
 * 
 * console.log(`Registered at ${result.smartAccountAddress}`);
 * console.log(`Tx: ${result.transactionHash}`);
 * console.log(`Gas cost: $${result.gasCost}`); // $0
 * ```
 */
export async function gaslessRegister(
  credentials: CdpCredentials,
  options: RegisterOptions & { accountName?: string; testnet?: boolean }
): Promise<RegisterResult> {
  const agent = await createAgentAccount(credentials, {
    name: options.accountName ?? `agent-${options.name.toLowerCase().replace(/\s+/g, "-")}`,
    testnet: options.testnet,
  });

  return agent.register(options);
}
