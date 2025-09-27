#!/usr/bin/env ts-node
/**
 * ENS .eth registration (Sepolia, NEW unwrapped controller with Registration struct)
 * Controller  : 0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968
 * PublicResolver (trusted): 0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5
 *
 * .env:
 *   SEPOLIA_RPC_URL=...
 *   PRIVATE_KEY=0x...
 *   OWNER_ADDR=0x... (optional; defaults to wallet)
 */

import * as dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

// --- Hard map: controller -> trusted PublicResolver ---
const CONTROLLER = "0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968";
const CONTROLLER_TO_TRUSTED_PR: Record<string, `0x${string}`> = {
  [CONTROLLER.toLowerCase()]: "0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5",
};

// --- ABI with NAMED components (ethers v6 needs this for object args) ---
const CTRL_ABI = [
  "function MIN_REGISTRATION_DURATION() view returns (uint256)",
  "function rentPrice(string label, uint256 duration) view returns (uint256)",
  "function available(string label) view returns (bool)",
  "function commit(bytes32 commitment)",
  // named tuple components:
  "function makeCommitment((string label,address owner,uint256 duration,bytes32 secret,address resolver,bytes[] data,uint8 reverseRecord,bytes32 referrer) registration) pure returns (bytes32)",
  "function register((string label,address owner,uint256 duration,bytes32 secret,address resolver,bytes[] data,uint8 reverseRecord,bytes32 referrer) registration) payable",
] as const;

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

const argv = yargs(hideBin(process.argv))
  .option("rpc",      { type: "string", default: process.env.SEPOLIA_RPC_URL, describe: "Sepolia RPC URL" })
  .option("pk",       { type: "string", default: process.env.PRIVATE_KEY, describe: "Private key (0x…)" })
  .option("label",    { type: "string", demandOption: true, describe: "Label (e.g., prady2509)" })
  .option("owner",    { type: "string", default: process.env.OWNER_ADDR, describe: "Owner (defaults to wallet)" })
  .option("duration", { type: "number", default: 31536000, describe: "Seconds (>= min)" })
  .option("overpay",  { type: "number", default: 5, describe: "Overpay % buffer" })
  .option("waitsec",  { type: "number", default: 70, describe: "Seconds to wait after commit (>=60)" })
  .option("secret",   { type: "string", describe: "Optional hex bytes32; random if omitted" })
  .strict()
  .parseSync();

if (!argv.rpc || !argv.pk) {
  console.error("Missing RPC or PRIVATE_KEY. Put them in .env or pass --rpc / --pk.");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(argv.rpc);
const wallet = new ethers.Wallet(argv.pk, provider);

(async () => {
  const net = await provider.getNetwork();
  console.log(`[dotenv] loaded\n🧪 Network: ${net.name} (${net.chainId})\n`);
  console.log(`🔑 Signer:  ${wallet.address}`);

  const controllerAddr = CONTROLLER as `0x${string}`;
  const resolver = CONTROLLER_TO_TRUSTED_PR[controllerAddr.toLowerCase()];
  if (!resolver) {
    throw new Error(`No trusted PublicResolver mapped for controller ${controllerAddr}`);
  }

  const ctl = new ethers.Contract(controllerAddr, CTRL_ABI, wallet);

  const label = argv.label.trim();
  const name = `${label}.eth`;
  const duration = BigInt(argv.duration);
  const owner = (argv.owner ?? wallet.address) as `0x${string}`;
  const reverseRecord = 0; // keep 0; set reverse separately later if you want

  const secretHex =
    argv.secret && ethers.isHexString(argv.secret, 32)
      ? (argv.secret as `0x${string}`)
      : (ethers.hexlify(ethers.randomBytes(32)) as `0x${string}`);

  console.log(`📝 Name: ${name}`);
  console.log(`👤 Owner: ${owner}`);
  console.log(`🧭 Resolver: ${resolver} (trusted by controller)`);
  console.log(`🧩 Secret: ${secretHex}`);
  console.log(`⏳ Duration: ${duration.toString()} sec`);

  try {
    const min: bigint = await ctl.MIN_REGISTRATION_DURATION();
    if (duration < min) throw new Error(`duration < MIN_REGISTRATION_DURATION (${min})`);
  } catch { /* some builds might not expose; ignore */ }

  try {
    const ok: boolean = await ctl.available(label);
    console.log(`🔎 Availability: ${ok ? "AVAILABLE" : "TAKEN"}`);
    if (!ok) return;
  } catch {
    console.log("🔎 Availability: checker not available on this build (continuing).");
  }

  const basePrice: bigint = await ctl.rentPrice(label, duration);
  const value: bigint = (basePrice * BigInt(100 + argv.overpay)) / 100n;
  console.log(`💰 Rent: ${ethers.formatEther(basePrice)} ETH  (+${argv.overpay}% → ${ethers.formatEther(value)} ETH sent)`);

  // Registration object matches the NAMED tuple in ABI
  const registration = {
    label,
    owner,
    duration,
    secret: secretHex,
    resolver: resolver as `0x${string}`,
    data: [] as string[],      // keep empty; controller will set only the initial addr via trusted PR
    reverseRecord,
    referrer: ethers.ZeroHash as `0x${string}`,
  };

  const commitment: string = await ctl.makeCommitment(registration);
  console.log(`🔒 Commitment: ${commitment}`);

  const tx1 = await ctl.commit(commitment);
  console.log(`⛏️  commit() tx: ${tx1.hash}`);
  await tx1.wait();
  console.log(`✅ commit() confirmed. Waiting ${argv.waitsec}s…`);
  await sleep(argv.waitsec * 1000);

  console.log("📝 register()…");
  const tx2 = await ctl.register(registration, { value });
  console.log(`⛏️  register() tx: ${tx2.hash}`);
  const rcpt = await tx2.wait();
  console.log(`✅ Registered ${name} in block ${rcpt?.blockNumber}`);
})().catch((e) => {
  console.error("❌ Error:", e?.reason || e?.message || e);
  process.exit(1);
});
