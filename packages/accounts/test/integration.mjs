#!/usr/bin/env node
/**
 * Integration test for @a3stack/accounts
 * 
 * Tests:
 * 1. Import from compiled dist
 * 2. createAgentAccount() — creates smart account via CDP
 * 3. agent.register() — gasless ERC-8004 registration on Base
 * 4. gaslessRegister() — one-shot convenience function
 * 
 * Usage:
 *   node test/integration.mjs [--live]
 * 
 * Without --live: tests imports and account creation only (no on-chain tx)
 * With --live: executes a real gasless registration on Base mainnet
 */

import { execSync } from "child_process";

// Import from compiled dist
const {
  createAgentAccount,
  gaslessRegister,
  REGISTRY_ADDRESS,
  REGISTRY_ABI,
  REGISTRATION_TYPE,
} = await import("../dist/index.js");

const LIVE = process.argv.includes("--live");

function keychain(key) {
  try {
    return execSync(`security find-generic-password -s "${key}" -w 2>/dev/null`, {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function assert(condition, msg) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✅ ${msg}`);
}

async function main() {
  console.log("🧪 @a3stack/accounts Integration Tests\n");

  // --- Test 1: Exports ---
  console.log("1️⃣  Exports");
  assert(typeof createAgentAccount === "function", "createAgentAccount is a function");
  assert(typeof gaslessRegister === "function", "gaslessRegister is a function");
  assert(REGISTRY_ADDRESS === "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", "REGISTRY_ADDRESS correct");
  assert(Array.isArray(REGISTRY_ABI), "REGISTRY_ABI is an array");
  assert(REGISTRATION_TYPE.includes("eip-8004"), "REGISTRATION_TYPE contains eip-8004");

  // --- Test 2: Credentials ---
  console.log("\n2️⃣  Credentials");
  const credentials = {
    apiKeyId: process.env.CDP_API_KEY_ID || keychain("cdp-api-key-id"),
    apiKeySecret: process.env.CDP_API_KEY_SECRET || keychain("cdp-api-secret"),
    walletSecret: process.env.CDP_WALLET_SECRET || keychain("cdp-wallet-secret"),
  };
  assert(!!credentials.apiKeyId, "CDP API Key ID loaded");
  assert(!!credentials.apiKeySecret, "CDP API Key Secret loaded");
  assert(!!credentials.walletSecret, "CDP Wallet Secret loaded");

  // --- Test 3: Account creation ---
  console.log("\n3️⃣  Account Creation");
  const testName = `a3stack-test-${Date.now()}`;
  const agent = await createAgentAccount(credentials, { name: testName });

  assert(agent.address.startsWith("0x"), `Smart account: ${agent.address}`);
  assert(agent.ownerAddress.startsWith("0x"), `Owner EOA: ${agent.ownerAddress}`);
  assert(agent.network === "base", `Network: ${agent.network}`);
  assert(typeof agent.sendUserOperation === "function", "sendUserOperation is a function");
  assert(typeof agent.register === "function", "register is a function");

  // --- Test 4: Idempotent retrieval ---
  console.log("\n4️⃣  Idempotent Retrieval");
  const agent2 = await createAgentAccount(credentials, { name: testName });
  assert(agent2.address === agent.address, `Same name returns same address: ${agent2.address}`);
  assert(agent2.ownerAddress === agent.ownerAddress, "Same owner address");

  if (!LIVE) {
    console.log("\n⏭️  Skipping live registration (run with --live to execute on-chain)");
    console.log("\n✅ All tests passed!");
    return;
  }

  // --- Test 5: Live gasless registration ---
  console.log("\n5️⃣  Live Gasless Registration (Base mainnet)");
  console.log("   ⛽ Sending UserOperation (CDP Paymaster sponsors gas)...");

  const result = await agent.register({
    name: "A3Stack Test Agent (integration)",
    description: "Integration test for @a3stack/accounts package",
    services: [{ type: "website", url: "https://a3stack.arcabot.ai" }],
  });

  assert(result.transactionHash.length > 0, `Tx hash: ${result.transactionHash}`);
  assert(result.userOpHash.length > 0, `UserOp hash: ${result.userOpHash}`);
  assert(result.smartAccountAddress === agent.address, "Smart account matches");
  assert(result.network === "base", "Network is base");
  assert(result.gasCost === 0, "Gas cost is $0");
  assert(result.sponsored === true, "Gas was sponsored");

  console.log(`\n🎉 Live registration successful!`);
  console.log(`   BaseScan: https://basescan.org/tx/${result.transactionHash}`);

  console.log("\n✅ All tests passed!");
}

main().catch((err) => {
  console.error("\n❌ Test failed:", err.message || err);
  if (err.cause) console.error("   Cause:", err.cause);
  process.exit(1);
});
