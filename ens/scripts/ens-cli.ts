/* scripts/ens-cli.ts - ENS Sepolia CLI (ethers v6)
   Enhanced ENS registration CLI with proper commit-reveal scheme
   
   Usage:
     pnpm ens quote <label> -y 1
     pnpm ens commit <label> [--secret 0x..]
     pnpm ens status <label> --secret 0x..
     pnpm ens register <label> -y 1 --secret 0x..
     pnpm ens all <label> -y 1                     (commit -> wait -> register)
     pnpm ens resolve <name>                       (resolve ENS name to address)
     pnpm ens reverse <address>                    (reverse resolve address to name)
*/
import 'dotenv/config';
import { ethers } from 'ethers';

type Json = Record<string, any>;

// Network configuration
const MAINNET_REGISTRY = '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e';
const MAINNET_CONTROLLER = '0x253553366da8546fc250f225fe3d25d0c782303b';
const SEPOLIA_REGISTRY = '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e'; // Same as mainnet
const SEPOLIA_CONTROLLER = '0xfb3ce5d01e0f33f41dbb39035db9745962f1f968';

// Note: ENS on Sepolia has known issues. Consider using Holesky testnet instead
const HOLESKY_REGISTRY = '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e';
const HOLESKY_CONTROLLER = '0xfce6ce4373cb6e7e470eaa55329638acd9dbd202';
const HOLESKY_PUBLIC_RESOLVER = '0x6925affda98274fe0376250187ccc4ac62866dcd';

const PK = process.env.PRIVATE_KEY!;

if (!PK) {
  console.error('Missing PRIVATE_KEY in .env');
  process.exit(1);
}

// Network selection function
function getNetworkConfig(network: 'mainnet' | 'sepolia' | 'holesky') {
  if (network === 'mainnet') {
    return {
      rpc: process.env.ETHEREUM_RPC_URL || process.env.MAINNET_RPC_URL,
      registry: process.env.ENS_REGISTRY || MAINNET_REGISTRY,
      controller: process.env.ENS_CONTROLLER || MAINNET_CONTROLLER,
      name: 'Ethereum Mainnet'
    };
  } else if (network === 'holesky') {
    return {
      rpc: process.env.HOLESKY_RPC_URL,
      registry: process.env.ENS_REGISTRY || HOLESKY_REGISTRY,
      controller: process.env.ENS_CONTROLLER || HOLESKY_CONTROLLER,
      name: 'Holesky Testnet'
    };
  } else {
    return {
      rpc: process.env.SEPOLIA_RPC_URL,
      registry: process.env.ENS_REGISTRY || SEPOLIA_REGISTRY,
      controller: process.env.ENS_CONTROLLER || SEPOLIA_CONTROLLER,
      name: 'Sepolia Testnet (⚠️ Known Issues)'
    };
  }
}

/* ---------- utils ---------- */
function toBytes32(hex: string) {
  if (!hex || !hex.startsWith('0x')) throw new Error('hex must start with 0x');
  return ethers.hexlify(hex);
}
function labelhash(label: string) {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}
function namehash(name: string) {
  let node = '0x' + '00'.repeat(32);
  const labels = name.split('.').filter(Boolean);
  for (let i = labels.length - 1; i >= 0; i--) {
    const lh = ethers.keccak256(ethers.toUtf8Bytes(labels[i]));
    node = ethers.keccak256(ethers.solidityPacked(['bytes32','bytes32'], [node, lh]));
  }
  return node;
}
function randSecret(): string {
  const a = ethers.randomBytes(32);
  return ethers.hexlify(a);
}
function ensureSecret(s?: string) {
  if (!s) return randSecret();
  if (!s.startsWith('0x') || s.length !== 66) throw new Error('Secret must be 32-byte hex (0x + 64 chars)');
  return s;
}
function yearsToSeconds(y: number) {
  return BigInt(Math.floor(y * 365 * 24 * 60 * 60));
}
function fmtEth(n: bigint) {
  return `${ethers.formatEther(n)} ETH`;
}

/* ---------- ABIs ---------- */
const REG_ABI = [
  { inputs:[{name:'node',type:'bytes32'}], name:'resolver', outputs:[{type:'address'}], stateMutability:'view', type:'function' },
  { inputs:[{name:'node',type:'bytes32'}], name:'owner',    outputs:[{type:'address'}], stateMutability:'view', type:'function' },
  { inputs:[{name:'node',type:'bytes32'},{name:'label',type:'bytes32'},{name:'owner',type:'address'},{name:'resolver',type:'address'},{name:'ttl',type:'uint64'}],
    name:'setSubnodeRecord', outputs:[], stateMutability:'nonpayable', type:'function' },
] as const;

const RESOLVER_ABI = [
  { inputs:[{name:'node',type:'bytes32'}], name:'addr', outputs:[{type:'address'}], stateMutability:'view', type:'function' },
  { inputs:[{name:'node',type:'bytes32'}], name:'name', outputs:[{type:'string'}], stateMutability:'view', type:'function' },
  { inputs:[{name:'node',type:'bytes32'},{name:'key',type:'string'}], name:'text', outputs:[{type:'string'}], stateMutability:'view', type:'function' },
  { inputs:[{name:'interfaceId',type:'bytes4'}], name:'supportsInterface', outputs:[{type:'bool'}], stateMutability:'view', type:'function' },
] as const;

const CTRL_ABI = [
  { inputs:[{name:'name',type:'string'}], name:'available', outputs:[{type:'bool'}], stateMutability:'view', type:'function' },
  { inputs:[], name:'minCommitmentAge', outputs:[{type:'uint256'}], stateMutability:'view', type:'function' },
  { inputs:[], name:'maxCommitmentAge', outputs:[{type:'uint256'}], stateMutability:'view', type:'function' },
  { inputs:[{name:'',type:'bytes32'}], name:'commitments', outputs:[{type:'uint256'}], stateMutability:'view', type:'function' },

  { inputs:[{name:'name',type:'string'},{name:'owner',type:'address'},{name:'secret',type:'bytes32'},{name:'resolver',type:'address'},{name:'addr',type:'address'}],
    name:'makeCommitmentWithConfig', outputs:[{type:'bytes32'}], stateMutability:'pure', type:'function' },
  { inputs:[{name:'name',type:'string'},{name:'owner',type:'address'},{name:'secret',type:'bytes32'}],
    name:'makeCommitment', outputs:[{type:'bytes32'}], stateMutability:'pure', type:'function' },

  { inputs:[{name:'commitment',type:'bytes32'}], name:'commit', outputs:[], stateMutability:'nonpayable', type:'function' },

  { inputs:[{name:'name',type:'string'},{name:'owner',type:'address'},{name:'duration',type:'uint256'},{name:'secret',type:'bytes32'},{name:'resolver',type:'address'},{name:'addr',type:'address'}],
    name:'registerWithConfig', outputs:[], stateMutability:'payable', type:'function' },
  { inputs:[{name:'name',type:'string'},{name:'owner',type:'address'},{name:'duration',type:'uint256'},{name:'secret',type:'bytes32'}],
    name:'register', outputs:[], stateMutability:'payable', type:'function' },

  // two rentPrice variants
  { inputs:[{name:'name',type:'string'},{name:'duration',type:'uint256'}], name:'rentPrice', outputs:[{type:'uint256'}], stateMutability:'view', type:'function' },
  { inputs:[{name:'name',type:'string'},{name:'duration',type:'uint256'}], name:'rentPrice', outputs:[{components:[{name:'base',type:'uint256'},{name:'premium',type:'uint256'}],name:'',type:'tuple'}], stateMutability:'view', type:'function' },
] as const;

/* ---------- wiring ---------- */
// For registration commands, we'll use Holesky by default (more reliable than Sepolia)
let config = getNetworkConfig('holesky');
if (!config.rpc) {
  console.error('Missing HOLESKY_RPC_URL in .env for registration');
  console.log('\n💡 Alternative: Use Sepolia testnet (has known issues)');
  console.log('   Set SEPOLIA_RPC_URL in .env and use --network sepolia');
  process.exit(1);
}

console.log(`✅ Using ${config.name} for ENS operations (recommended for testing)`);

const provider = new ethers.JsonRpcProvider(config.rpc);
const wallet   = new ethers.Wallet(PK, provider);
const registry = new ethers.Contract(config.registry, REG_ABI, wallet);
const ctrl     = new ethers.Contract(config.controller, CTRL_ABI, wallet);

// Preflight check: verify contract has code
async function verifyContractCode() {
  const code = await provider.getCode(ctrl.target as string);
  if (code === '0x') {
    throw new Error(`No contract code at ${ctrl.target} on this RPC. Are you on the correct network?`);
  }
  console.log(`✅ Controller has code (${code.length} bytes)`);
}

async function getPublicResolver(): Promise<string> {
  // For Holesky, use the known Public Resolver address
  if (config.name.includes('Holesky')) {
    return HOLESKY_PUBLIC_RESOLVER;
  }
  
  // For other networks, try to resolve resolver.eth
  const node = namehash('resolver.eth');
  const resOnResolver = await registry.resolver(node);
  if (resOnResolver === ethers.ZeroAddress) return ethers.ZeroAddress;
  const r = new ethers.Contract(resOnResolver, RESOLVER_ABI, wallet);
  try {
    const pub = await r.addr(node);
    return pub;
  } catch { return ethers.ZeroAddress; }
}

async function rentPrice(label: string, dur: bigint): Promise<bigint> {
  try {
    // Try the simple rentPrice function first with static call
    const v: bigint = await ctrl.rentPrice.staticCall(label, dur);
    return v;
  } catch (e: any) {
    console.log(`⚠️  rentPrice failed: ${e.message}`);
    try {
      // Try the tuple version with static call
      const t: { base: bigint; premium: bigint } = await ctrl.rentPrice.staticCall(label, dur);
      return (t.base ?? 0n) + (t.premium ?? 0n);
    } catch (e2: any) {
      console.error(`❌ Both rentPrice methods failed: ${e2.message}`);
      console.log(`💡 This might be an RPC issue. Try switching endpoints:`);
      console.log(`   HOLESKY_RPC_URL=https://holesky.infura.io/v3/YOUR_KEY`);
      throw new Error(`Cannot get rent price: ${e2.message}`);
    }
  }
}

function parseArgs(): { cmd: string; args: string[]; flags: Json } {
  const [,,cmd, ...rest] = process.argv;
  const flags: Json = {};
  const args: string[] = [];
  for (let i=0;i<rest.length;i++) {
    const v = rest[i];
    if (v === '-y' || v === '--years') { flags.years = Number(rest[++i]); continue; }
    if (v === '--secret') { flags.secret = rest[++i]; continue; }
    if (v === '--wait') { flags.wait = Number(rest[++i] ?? 60); continue; }
    if (v === '--network' || v === '-n') { flags.network = rest[++i]; continue; }
    args.push(v);
  }
  return { cmd: (cmd||'').toLowerCase(), args, flags };
}

function validateLabel(label: string): boolean {
  if (!label || label.length === 0) return false;
  if (label.length > 63) return false; // ENS label length limit
  if (!/^[a-z0-9-]+$/.test(label)) return false; // Only lowercase alphanumeric and hyphens
  if (label.startsWith('-') || label.endsWith('-')) return false; // No leading/trailing hyphens
  return true;
}

function validateName(name: string): boolean {
  if (!name || name.length === 0) return false;
  const parts = name.split('.');
  if (parts.length < 2) return false;
  return parts.every(part => validateLabel(part));
}

/* ---------- commands ---------- */
async function cmdTest() {
  console.log(`🧪 Testing ENS contracts on ${config.name}...`);
  
  try {
    // Test network connection
    const network = await provider.getNetwork();
    console.log(`✅ Network: ${network.name} (${Number(network.chainId)})`);
    
    // Test wallet
    console.log(`✅ Wallet: ${wallet.address}`);
    
    // Test contract code
    await verifyContractCode();
    
    // Test registry
    try {
      const resolver = await registry.resolver(namehash('eth'));
      console.log(`✅ Registry: Connected (resolver.eth = ${resolver})`);
    } catch (e: any) {
      console.log(`❌ Registry: Failed - ${e.message}`);
    }
    
    // Test controller with static call
    try {
      const available = await ctrl.available.staticCall('test');
      console.log(`✅ Controller: Connected (test.eth available = ${available})`);
    } catch (e: any) {
      console.log(`❌ Controller: Failed - ${e.message}`);
      console.log(`💡 Try switching to a different RPC endpoint (Infura/Alchemy)`);
      console.log(`💡 Current RPC: ${config.rpc}`);
    }
    
  } catch (e: any) {
    console.error(`❌ Test failed: ${e.message}`);
  }
}

async function cmdQuote(label: string, years = 1) {
  if (!validateLabel(label)) {
    console.error(`❌ Invalid label: ${label}. Must be lowercase alphanumeric with hyphens, 1-63 chars, no leading/trailing hyphens.`);
    process.exit(1);
  }
  
  console.log(`🔍 Testing ENS controller connection...`);
  
  try {
    // Verify contract has code first
    await verifyContractCode();
    
    // Test if controller is working with static call
    const available = await ctrl.available.staticCall(label);
    console.log(`✅ Controller connected. ${label}.eth is ${available ? 'available' : 'NOT available'}`);
  } catch (e: any) {
    console.error(`❌ Controller test failed: ${e.message}`);
    console.log(`💡 Try switching to a different RPC endpoint:`);
    console.log(`   HOLESKY_RPC_URL=https://holesky.infura.io/v3/YOUR_KEY`);
    console.log(`   or https://eth-holesky.g.alchemy.com/v2/YOUR_KEY`);
    process.exit(1);
  }
  
  const dur = yearsToSeconds(years);
  const price = await rentPrice(label, dur);
  console.log(`💰 Registration price for ${label}.eth (${years} year${years > 1 ? 's' : ''}) = ${fmtEth(price)} (${price} wei)`);
}

async function cmdCommit(label: string, secret?: string) {
  if (!validateLabel(label)) {
    console.error(`❌ Invalid label: ${label}. Must be lowercase alphanumeric with hyphens, 1-63 chars, no leading/trailing hyphens.`);
    process.exit(1);
  }
  
  const network = await provider.getNetwork();
  console.log(`🌐 Using ${network.name} (${Number(network.chainId)}) as ${wallet.address}`);

  const available = await ctrl.available(label);
  if (!available) { 
    console.error(`❌ ${label}.eth is NOT available.`); 
    process.exit(1); 
  }
  console.log(`✅ ${label}.eth is available for registration`);

  const resolver = await getPublicResolver();
  if (resolver === ethers.ZeroAddress) console.warn('⚠️  PublicResolver not auto-detected; will commit without resolver config');

  const s = ensureSecret(secret);
  const withCfg = resolver !== ethers.ZeroAddress;

  let commitment: string;
  try {
    if (withCfg) commitment = await ctrl.makeCommitmentWithConfig(label, wallet.address, s, resolver, wallet.address);
    else commitment = await ctrl.makeCommitment(label, wallet.address, s);
  } catch {
    commitment = await ctrl.makeCommitment(label, wallet.address, s);
  }
  console.log(`commitment = ${commitment}`);

  // duplicate / ages
  let minAge = 60, maxAge = 86400;
  try { minAge = Number(await ctrl.minCommitmentAge()); } catch {}
  try { maxAge = Number(await ctrl.maxCommitmentAge()); } catch {}
  console.log(`minAge=${minAge}s maxAge=${maxAge}s`);

  try {
    const ts: bigint = await ctrl.commitments(commitment);
    if (ts !== 0n) {
      const now = BigInt(Math.floor(Date.now()/1000));
      const age = now - ts;
      if (age < BigInt(minAge)) {
        console.error(`❌ Unexpired previous commitment. Wait ~${Number(BigInt(minAge)-age)}s or use a NEW --secret.`);
        process.exit(1);
      }
      if (age <= BigInt(maxAge)) {
        console.log(`ℹ️  Existing commitment is valid (age ${age}s). You can run "register" now with the same --secret.`);
        return;
      }
    }
  } catch {}

  // estimate + send
  try { await ctrl.commit.estimateGas(commitment); } catch (e:any) {
    console.error(`❌ commit would revert (estimation): ${e.reason || e.shortMessage || e.message}`); process.exit(1);
  }

  const bal = await provider.getBalance(wallet.address);
  if (bal === 0n) { console.error('❌ Balance is 0 on Sepolia. Fund a little test ETH.'); process.exit(1); }

  const tx = await ctrl.commit(commitment);
  console.log('tx:', tx.hash);
  await tx.wait();
  console.log('✅ commit mined. Save your secret!\nsecret:', s);
}

async function cmdStatus(label: string, secret: string) {
  const s = ensureSecret(secret);
  const resolver = await getPublicResolver();
  let commitment: string;
  try { commitment = await ctrl.makeCommitmentWithConfig(label, wallet.address, s, resolver, wallet.address); }
  catch { commitment = await ctrl.makeCommitment(label, wallet.address, s); }

  const minAge = Number(await ctrl.minCommitmentAge().catch(()=>60));
  const maxAge = Number(await ctrl.maxCommitmentAge().catch(()=>86400));
  const ts: bigint = await ctrl.commitments(commitment);
  if (ts === 0n) { console.log('No existing commitment found for this tuple.'); return; }

  const now = BigInt(Math.floor(Date.now()/1000));
  const age = now - ts;
  console.log(`commitment: ${commitment}`);
  console.log(`created:   ${ts}  (age ${age}s)`);
  console.log(`minAge:    ${minAge}s  maxAge: ${maxAge}s`);
  if (age < BigInt(minAge)) {
    const left = Number(BigInt(minAge)-age);
    console.log(`⏳ wait ~${left}s before registering`);
  } else {
    console.log('✅ You can register now.');
  }
}

async function cmdRegister(label: string, years = 1, secret?: string) {
  const s = ensureSecret(secret);
  const dur = yearsToSeconds(years);
  const price = await rentPrice(label, dur);

  const resolver = await getPublicResolver();
  let tx, rc;
  try {
    tx = await ctrl.registerWithConfig(label, wallet.address, dur, s, resolver === ethers.ZeroAddress ? ethers.ZeroAddress : resolver, wallet.address, { value: price });
    rc = await tx.wait();
  } catch (e) {
    console.warn('registerWithConfig failed, falling back to register(...)');
    tx = await ctrl.register(label, wallet.address, dur, s, { value: price });
    rc = await tx.wait();
  }
  console.log('tx:', tx.hash);

  // verify owner
  const node = namehash(`${label}.eth`);
  const owner = await registry.owner(node);
  console.log(`✅ registered. owner(${label}.eth) = ${owner}`);
}

async function cmdAll(label: string, years = 1, waitSec = 60) {
  const secret = randSecret();
  console.log('using fresh secret:', secret);
  await cmdCommit(label, secret);
  console.log(`⏳ waiting ${waitSec}s (minAge) ...`);
  await new Promise(r => setTimeout(r, waitSec*1000));
  await cmdRegister(label, years, secret);
}

async function cmdResolve(name: string, network: 'mainnet' | 'sepolia' | 'holesky' = 'mainnet') {
  if (!validateName(name)) {
    console.error(`❌ Invalid name: ${name}. Must be a valid ENS name (e.g., vitalik.eth)`);
    process.exit(1);
  }
  
  const config = getNetworkConfig(network);
  if (!config.rpc) {
    let rpcVar = 'ETHEREUM_RPC_URL';
    if (network === 'sepolia') rpcVar = 'SEPOLIA_RPC_URL';
    if (network === 'holesky') rpcVar = 'HOLESKY_RPC_URL';
    console.error(`❌ Missing RPC URL for ${config.name}. Set ${rpcVar} in .env`);
    process.exit(1);
  }
  
  console.log(`🔍 Resolving ${name} on ${config.name}...`);
  
  const provider = new ethers.JsonRpcProvider(config.rpc);
  const registry = new ethers.Contract(config.registry, REG_ABI, provider);
  
  const node = namehash(name);
  const resolverAddr = await registry.resolver(node);
  
  if (resolverAddr === ethers.ZeroAddress) {
    console.log(`❌ No resolver set for ${name}`);
    return;
  }
  
  console.log(`📍 Resolver: ${resolverAddr}`);
  
  const resolver = new ethers.Contract(resolverAddr, RESOLVER_ABI, provider);
  
  try {
    const addr = await resolver.addr(node);
    if (addr === ethers.ZeroAddress) {
      console.log(`❌ No address record set for ${name}`);
    } else {
      console.log(`✅ ${name} → ${addr}`);
    }
  } catch (e: any) {
    console.log(`❌ Failed to resolve address: ${e.message}`);
  }
  
  // Try to get text records
  const textKeys = ['url', 'avatar', 'description', 'email', 'com.twitter', 'com.github'];
  for (const key of textKeys) {
    try {
      const value = await resolver.text(node, key);
      if (value && value !== '') {
        console.log(`📝 ${key}: ${value}`);
      }
    } catch {
      // Ignore text record errors
    }
  }
}

async function cmdReverse(address: string, network: 'mainnet' | 'sepolia' | 'holesky' = 'mainnet') {
  // Validate address
  if (!ethers.isAddress(address)) {
    console.error(`❌ Invalid address: ${address}`);
    return;
  }
  
  const config = getNetworkConfig(network);
  if (!config.rpc) {
    let rpcVar = 'ETHEREUM_RPC_URL';
    if (network === 'sepolia') rpcVar = 'SEPOLIA_RPC_URL';
    if (network === 'holesky') rpcVar = 'HOLESKY_RPC_URL';
    console.error(`❌ Missing RPC URL for ${config.name}. Set ${rpcVar} in .env`);
    process.exit(1);
  }
  
  console.log(`🔄 Reverse resolving ${address} on ${config.name}...`);
  
  const provider = new ethers.JsonRpcProvider(config.rpc);
  const registry = new ethers.Contract(config.registry, REG_ABI, provider);
  
  // Get reverse node for addr.reverse
  const ADDR_REVERSE_NODE = '0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2';
  const reverseNode = ethers.keccak256(
    ethers.solidityPacked(['bytes32', 'bytes32'], [ADDR_REVERSE_NODE, ethers.keccak256(ethers.getBytes(address))])
  );
  
  const resolverAddr = await registry.resolver(reverseNode);
  
  if (resolverAddr === ethers.ZeroAddress) {
    console.log(`❌ No reverse record set for ${address}`);
    return;
  }
  
  console.log(`📍 Reverse resolver: ${resolverAddr}`);
  
  const resolver = new ethers.Contract(resolverAddr, RESOLVER_ABI, provider);
  
  try {
    const name = await resolver.name(reverseNode);
    if (!name || name === '') {
      console.log(`❌ No reverse name set for ${address}`);
      return;
    }
    
    console.log(`✅ ${address} → ${name}`);
    
    // Verify forward resolution
    console.log(`🔍 Verifying forward resolution...`);
    const forwardNode = namehash(name);
    const forwardResolverAddr = await registry.resolver(forwardNode);
    
    if (forwardResolverAddr !== ethers.ZeroAddress) {
      const forwardResolver = new ethers.Contract(forwardResolverAddr, RESOLVER_ABI, provider);
      try {
        const forwardAddr = await forwardResolver.addr(forwardNode);
        if (forwardAddr.toLowerCase() === address.toLowerCase()) {
          console.log(`✅ Forward resolution verified: ${name} → ${forwardAddr}`);
        } else {
          console.log(`⚠️  Forward resolution mismatch: ${name} → ${forwardAddr} (expected ${address})`);
        }
      } catch (e: any) {
        console.log(`❌ Failed to verify forward resolution: ${e.message}`);
      }
    } else {
      console.log(`⚠️  No forward resolver for ${name}`);
    }
    
  } catch (e: any) {
    console.log(`❌ Failed to get reverse name: ${e.message}`);
  }
}

/* ---------- main ---------- */
(async () => {
  const { cmd, args, flags } = parseArgs();
  try {
    // Determine network for resolve/reverse commands
    let network: 'mainnet' | 'sepolia' | 'holesky' = 'mainnet';
    if (flags.network === 'sepolia' || flags.network === 'testnet') {
      network = 'sepolia';
    } else if (flags.network === 'holesky') {
      network = 'holesky';
    }
    
    if (cmd === 'test')       await cmdTest();
    else if (cmd === 'quote')      await cmdQuote(args[0], Number(flags.years ?? 1));
    else if (cmd === 'commit')    await cmdCommit(args[0], flags.secret);
    else if (cmd === 'status')    await cmdStatus(args[0], flags.secret);
    else if (cmd === 'register')  await cmdRegister(args[0], Number(flags.years ?? 1), flags.secret);
    else if (cmd === 'all')       await cmdAll(args[0], Number(flags.years ?? 1), Number(flags.wait ?? (await ctrl.minCommitmentAge().catch(()=>60))));
    else if (cmd === 'resolve')  await cmdResolve(args[0], network);
    else if (cmd === 'reverse')  await cmdReverse(args[0], network);
    else {
      console.log(`ENS Sepolia CLI - Enhanced ENS Registration & Resolution
      
Test Commands:
  pnpm ens test                                 # Test ENS contracts connection

Registration Commands:
  pnpm ens quote <label> -y 1                    # Get registration price
  pnpm ens commit <label> [--secret 0x...]      # Commit to register (step 1)
  pnpm ens status <label> --secret 0x...        # Check commitment status
  pnpm ens register <label> -y 1 --secret 0x... # Register name (step 2)
  pnpm ens all <label> -y 1 [--wait <seconds>]  # Full flow: commit -> wait -> register

Resolution Commands:
  pnpm ens resolve <name> [--network mainnet|sepolia|holesky]  # Resolve ENS name to address
  pnpm ens reverse <address> [--network mainnet|sepolia|holesky] # Reverse resolve address to name

Environment Variables Required:
  PRIVATE_KEY - Your wallet private key
  HOLESKY_RPC_URL - Holesky RPC endpoint (✅ Default for registration)
  SEPOLIA_RPC_URL - Sepolia RPC endpoint (⚠️ Known issues with ENS)
  ETHEREUM_RPC_URL - Mainnet RPC endpoint (for mainnet resolution)
  ENS_REGISTRY - ENS Registry address (optional, defaults to 0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e)
  ENS_CONTROLLER - ENS Controller address (optional, auto-detected per network)

Recommended RPC Endpoints:
  HOLESKY_RPC_URL=https://holesky.infura.io/v3/YOUR_KEY
  HOLESKY_RPC_URL=https://eth-holesky.g.alchemy.com/v2/YOUR_KEY

✅ Using Holesky testnet by default for reliable ENS testing.

Contract Addresses:
  Holesky Registry: 0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e
  Holesky Controller: 0xfce6ce4373cb6e7e470eaa55329638acd9dbd202
  Holesky Resolver: 0x6925affda98274fe0376250187ccc4ac62866dcd

Examples:
  pnpm ens test                                    # Test connection
  pnpm ens quote myname -y 1                      # Get price
  pnpm ens all myname -y 1                        # Full registration
  pnpm ens resolve vitalik.eth --network mainnet # Mainnet resolution
  pnpm ens resolve myname.eth --network holesky  # Holesky resolution

💡 For your EventEscrow dapp:
  - Resolve ENS names on the same chain as your contract
  - Use mainnet resolution for mainnet ENS names
  - Use Holesky resolution for testnet ENS names
`);
    }
  } catch (e:any) {
    console.error('ERROR:', e.reason || e.shortMessage || e.message || e);
    process.exit(1);
  }
})();
