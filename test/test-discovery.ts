/**
 * Integration test: AgentDiscovery + A3Stack discovery methods
 * 
 * Tests against live ag0 subgraph — read-only, no gas.
 */

import { AgentDiscovery } from "../packages/identity/src/discovery.js";

const RPC_URL = process.env.ALCHEMY_KEY
  ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
  : "https://eth.llamarpc.com";

const BASE_RPC = process.env.ALCHEMY_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
  : "https://base.llamarpc.com";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    failed++;
  }
}

async function testDiscovery() {
  console.log("\n=== Test 1: AgentDiscovery — search by name ===");
  const discovery = new AgentDiscovery({ chainId: 1, rpcUrl: RPC_URL });

  const results = await discovery.search({ name: "Arca" });
  assert(results.length > 0, `Found ${results.length} agents matching "Arca"`);

  const arca = results.find((a: any) => a.name === "Arca" && a.walletAddress?.toLowerCase() === "0x1be93c700ddc596d701e8f2106b8f9166c625adb");
  assert(!!arca, "Found our Arca agent in results");

  if (arca) {
    assert(arca.active === true, "Arca is active");
    assert(arca.web === "https://arcabot.ai", `Web endpoint: ${arca.web}`);
    assert(arca.ens === "arcabot.eth", `ENS: ${arca.ens}`);
    assert((arca as any).agentId === "1:22775", `Agent ID: ${(arca as any).agentId}`);
  }

  console.log("\n=== Test 2: AgentDiscovery — reputation ===");
  const rep = await discovery.getReputation("1:22775");
  assert(typeof rep.count === "number", `Feedback count: ${rep.count}`);
  assert(typeof rep.averageValue === "number", `Average value: ${rep.averageValue}`);
  assert(rep.count >= 2, `Has at least 2 feedback entries (got ${rep.count})`);

  console.log("\n=== Test 3: AgentDiscovery — feedback entries ===");
  const feedback = await discovery.getFeedback("1:22775");
  assert(Array.isArray(feedback), "Feedback is an array");
  assert(feedback.length >= 2, `Has at least 2 entries (got ${feedback.length})`);

  if (feedback.length > 0) {
    const entry = feedback[0];
    assert(typeof entry.value === "number", `First entry value: ${entry.value}`);
    assert(Array.isArray(entry.tags), `First entry tags: ${entry.tags}`);
    assert(typeof entry.reviewer === "string", `First entry reviewer: ${entry.reviewer.slice(0, 10)}...`);
    assert(typeof entry.isRevoked === "boolean", `Revoked: ${entry.isRevoked}`);
  }

  console.log("\n=== Test 4: AgentDiscovery — cross-chain (Base) ===");
  const baseDiscovery = new AgentDiscovery({ chainId: 8453, rpcUrl: BASE_RPC });
  const baseResults = await baseDiscovery.search({ name: "Arca" });
  assert(baseResults.length > 0, `Found ${baseResults.length} agents on Base matching "Arca"`);

  console.log("\n=== Test 5: AgentDiscovery — getAgent ===");
  const agent = await discovery.getAgent("1:22775");
  if (agent) {
    assert(agent.name === "Arca", `Name: ${agent.name}`);
    assert(true, `getAgent returned an object (Agent class, not plain data)`);
  } else {
    assert(false, "getAgent returned null");
  }

  console.log("\n=== Test 6: AgentDiscovery — search with feedback filter ===");
  const highRep = await discovery.search({ feedback: { minValue: 90 } });
  assert(Array.isArray(highRep), `High-rep search returned ${highRep.length} results`);

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(40)}`);
  
  if (failed > 0) process.exit(1);
}

testDiscovery().catch(e => {
  console.error("Test crashed:", e.message);
  process.exit(1);
});
