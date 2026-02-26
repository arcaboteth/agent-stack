/**
 * CDP Smart Account wrapper for gasless agent operations
 * 
 * Uses Coinbase Developer Platform SDK for:
 * - Server wallet management (EOA owner)
 * - Smart account creation (ERC-4337)
 * - Automatic gas sponsorship via CDP Paymaster on Base
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { encodeFunctionData } from "viem";
import { REGISTRY_ADDRESS, REGISTRY_ABI, REGISTRATION_TYPE } from "./constants.js";
import type {
  CdpCredentials,
  CreateAgentAccountOptions,
  AgentAccount,
  RegisterOptions,
  RegisterResult,
  UserOperationCall,
  UserOperationResult,
} from "./types.js";

/**
 * Create a gasless smart account for an AI agent.
 * 
 * The account is an ERC-4337 smart account on Base, owned by a CDP-managed
 * EOA. All transactions are gas-sponsored by the CDP Paymaster.
 * 
 * @example
 * ```ts
 * import { createAgentAccount } from "@a3stack/accounts";
 * 
 * const agent = await createAgentAccount({
 *   apiKeyId: process.env.CDP_API_KEY_ID!,
 *   apiKeySecret: process.env.CDP_API_KEY_SECRET!,
 *   walletSecret: process.env.CDP_WALLET_SECRET!,
 * }, { name: "my-agent" });
 * 
 * // Register on ERC-8004 with zero gas
 * const result = await agent.register({
 *   name: "My Agent",
 *   description: "An autonomous AI agent",
 * });
 * console.log(`Registered! Tx: ${result.transactionHash}`);
 * ```
 */
export async function createAgentAccount(
  credentials: CdpCredentials,
  options: CreateAgentAccountOptions = {}
): Promise<AgentAccount> {
  const { apiKeyId, apiKeySecret, walletSecret } = credentials;
  const network = options.testnet ? "base-sepolia" : "base";
  const accountName = options.name ?? "a3stack-agent";

  // Initialize CDP client
  const cdp = new CdpClient({ apiKeyId, apiKeySecret, walletSecret });

  // Create or retrieve the owner EOA
  const owner = await cdp.evm.getOrCreateAccount({
    name: `${accountName}-owner`,
  });

  // Create or retrieve the smart account
  const smartAccount = await cdp.evm.getOrCreateSmartAccount({
    name: accountName,
    owner,
  });

  // Scope to Base network
  const scopedAccount = await smartAccount.useNetwork(network);

  // Build the AgentAccount interface
  const agentAccount: AgentAccount = {
    address: smartAccount.address as `0x${string}`,
    ownerAddress: owner.address as `0x${string}`,
    network: network as "base" | "base-sepolia",

    async sendUserOperation(calls: UserOperationCall[]): Promise<UserOperationResult> {
      const userOp = await scopedAccount.sendUserOperation({
        calls: calls.map((c) => ({
          to: c.to,
          value: c.value ?? 0n,
          data: c.data ?? "0x",
        })),
      });

      const receipt = await scopedAccount.waitForUserOperation(userOp);
      const txHash = (receipt as any).transactionHash ?? String(receipt);

      return {
        userOpHash: (userOp as any).userOpHash ?? String(userOp),
        transactionHash: txHash,
      };
    },

    async register(opts: RegisterOptions): Promise<RegisterResult> {
      // Build the agent registration JSON
      const registration = {
        type: REGISTRATION_TYPE,
        name: opts.name,
        description: opts.description,
        ...(opts.image ? { image: opts.image } : {}),
        services: opts.services ?? [],
        x402Support: opts.x402Support ?? false,
        active: true,
        registrations: opts.existingRegistrations ?? [],
      };

      const json = JSON.stringify(registration);
      const agentURI = `data:application/json;base64,${Buffer.from(json).toString("base64")}`;

      // Encode the register() call
      const callData = encodeFunctionData({
        abi: REGISTRY_ABI,
        functionName: "register",
        args: [agentURI],
      });

      // Send gasless UserOperation
      const userOp = await scopedAccount.sendUserOperation({
        calls: [{
          to: REGISTRY_ADDRESS,
          value: 0n,
          data: callData,
        }],
      });

      const receipt = await scopedAccount.waitForUserOperation(userOp);
      const txHash = (receipt as any).transactionHash ?? String(receipt);

      return {
        transactionHash: txHash,
        userOpHash: (userOp as any).userOpHash ?? String(userOp),
        smartAccountAddress: smartAccount.address as `0x${string}`,
        network,
        gasCost: 0,
        sponsored: true,
      };
    },
  };

  return agentAccount;
}
