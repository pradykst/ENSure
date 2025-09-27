import { ethers } from "hardhat";

async function main() {
  const ensRegistry = process.env.ENS_REGISTRY!;
  if (!ensRegistry) throw new Error("ENS_REGISTRY missing in .env");

  const Factory = await ethers.getContractFactory("EventFactory");
  const factory = await Factory.deploy(ensRegistry);
  await factory.waitForDeployment();

  // ethers v6: address is on `target`; some typings miss `getAddress()`
  const addr = (factory as any).target ?? (await (factory as any).getAddress());
  console.log("EventFactory deployed:", addr);
}

main().catch((e) => { console.error(e); process.exit(1); });
