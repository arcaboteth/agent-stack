/**
 * Multi-chain agent discovery — find all registrations across supported chains
 */

import { createPublicClient, http } from "viem";
import {
  IDENTITY_REGISTRY_ADDRESS,
  IDENTITY_REGISTRY_ABI,
  SUPPORTED_CHAINS,
} from "./constants.js";
import { fetchRegistrationFile } from "./verify.js";
import type { AgentRegistrationFile } from "./types.js";

export interface ChainRegistration {
  chainId: number;
  chainName: string;
  agentId: number;
  owner: `0x${string}`;
  agentUri: string;
  registration: AgentRegistrationFile | null;
  globalId: string;
}

/**
 * Find all ERC-8004 registrations for a wallet address across all supported chains.
 * Scans Transfer events (mint from 0x0) on each chain in parallel.
 * 
 * @example
 * ```ts
 * const regs = await findAllRegistrations("0x1be93C...");
 * console.log(`Found ${regs.length} registrations across ${regs.map(r => r.chainName).join(", ")}`);
 * ```
 */
export async function findAllRegistrations(
  walletAddress: `0x${string}`,
  options?: {
    /** Only scan these chain IDs (default: all supported) */
    chainIds?: number[];
    /** Fetch and parse registration files (slower, default: false) */
    fetchRegistration?: boolean;
    /** Registry address override */
    registry?: `0x${string}`;
    /** Timeout per chain in ms (default: 10000) */
    timeoutMs?: number;
  }
): Promise<ChainRegistration[]> {
  const registry = options?.registry ?? IDENTITY_REGISTRY_ADDRESS;
  const chainIds = options?.chainIds ?? Object.keys(SUPPORTED_CHAINS).map(Number);
  const fetchReg = options?.fetchRegistration ?? false;
  const timeout = options?.timeoutMs ?? 10000;

  const results: ChainRegistration[] = [];

  // Scan all chains in parallel
  const promises = chainIds.map(async (chainId) => {
    const chain = SUPPORTED_CHAINS[chainId];
    if (!chain) return;

    try {
      const client = createPublicClient({ transport: http(chain.rpc) });

      // Check balance first (fast)
      const balance = (await Promise.race([
        client.readContract({
          address: registry,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: "balanceOf",
          args: [walletAddress],
        }),
        new Promise<bigint>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), timeout)
        ),
      ])) as bigint;

      if (balance === 0n) return;

      // Find the agent IDs via Transfer events (mint from 0x0)
      const paddedAddress = walletAddress.toLowerCase().replace("0x", "0x000000000000000000000000");
      const logs = await client.getLogs({
        address: registry,
        event: {
          type: "event",
          name: "Transfer",
          inputs: [
            { type: "address", indexed: true, name: "from" },
            { type: "address", indexed: true, name: "to" },
            { type: "uint256", indexed: true, name: "tokenId" },
          ],
        },
        args: {
          from: "0x0000000000000000000000000000000000000000" as `0x${string}`,
          to: walletAddress,
        },
        fromBlock: 0n,
        toBlock: "latest",
      });

      for (const log of logs) {
        const agentId = Number(log.args.tokenId);

        // Get the current owner (could have been transferred)
        const currentOwner = (await client.readContract({
          address: registry,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: "ownerOf",
          args: [BigInt(agentId)],
        })) as `0x${string}`;

        // Only include if still owned by the queried wallet
        if (currentOwner.toLowerCase() !== walletAddress.toLowerCase()) continue;

        // Get agent URI
        const agentUri = (await client.readContract({
          address: registry,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: "tokenURI",
          args: [BigInt(agentId)],
        })) as string;

        let registration: AgentRegistrationFile | null = null;
        if (fetchReg) {
          try {
            registration = await fetchRegistrationFile(agentUri);
          } catch { /* ignore fetch errors */ }
        }

        results.push({
          chainId,
          chainName: chain.name,
          agentId,
          owner: currentOwner,
          agentUri,
          registration,
          globalId: `eip155:${chainId}:${registry}#${agentId}`,
        });
      }
    } catch {
      // Chain unreachable or other error — skip silently
    }
  });

  await Promise.allSettled(promises);

  // Sort by chainId for consistent ordering
  return results.sort((a, b) => a.chainId - b.chainId);
}
