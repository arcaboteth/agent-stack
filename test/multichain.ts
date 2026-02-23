import { findAllRegistrations } from "@agent-stack/identity";

async function main() {
  console.log("\n🌐 Scanning all 16 chains for Arca's registrations...\n");
  const regs = await findAllRegistrations("0x1be93C700dDC596D701E8F2106B8F9166C625Adb" as `0x${string}`);
  console.log(`Found ${regs.length} registrations:\n`);
  for (const r of regs) {
    console.log(`  ✅ ${r.chainName.padEnd(12)} (chain ${String(r.chainId).padEnd(6)}) → #${r.agentId}  ${r.globalId}`);
  }
  console.log();
}

main().catch(console.error);
