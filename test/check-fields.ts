import { AgentDiscovery } from "../packages/identity/src/discovery.js";

const RPC = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`;
const d = new AgentDiscovery({ chainId: 1, rpcUrl: RPC });

const results = await d.search({ name: "Arca" });
const arca = results.find((a: any) => a.name === "Arca" && a.ens === "arcabot.eth");
if (arca) {
  console.log("Search result keys:", Object.keys(arca).join(", "));
  console.log("agentId field:", (arca as any).agentId);
  console.log("id field:", (arca as any).id);
  console.log("feedbackCount:", (arca as any).feedbackCount);
}

const agent = await d.getAgent("1:22775");
if (agent) {
  console.log("\nloadAgent keys:", Object.keys(agent).join(", "));
  console.log("feedbackCount:", (agent as any).feedbackCount);
}
