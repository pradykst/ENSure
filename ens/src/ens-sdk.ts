/**
 * ENS SDK - Enhanced ENS Resolution & Internal Naming System
 * 
 * Features:
 * - Real ENS resolution (mainnet/testnet)
 * - Internal contract/transaction naming system
 * - Cross-chain support
 * - Caching and persistence
 */

import { ethers } from 'ethers';

// Types
export interface NetworkConfig {
  rpc: string;
  registry: string;
  controller: string;
  name: string;
}

export interface InternalName {
  type: 'contract' | 'transaction' | 'event';
  address: string;
  name: string;
  network: string;
  timestamp: number;
}

export interface ENSResult {
  name: string;
  address: string;
  network: string;
  isInternal: boolean;
  type?: 'contract' | 'transaction' | 'event';
}

// Network configurations
const NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    rpc: process.env.ETHEREUM_RPC_URL || '',
    registry: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
    controller: '0x253553366da8546fc250f225fe3d25d0c782303b',
    name: 'Ethereum Mainnet'
  },
  holesky: {
    rpc: process.env.HOLESKY_RPC_URL || '',
    registry: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
    controller: '0xfce6ce4373cb6e7e470eaa55329638acd9dbd202',
    name: 'Holesky Testnet'
  },
  sepolia: {
    rpc: process.env.SEPOLIA_RPC_URL || '',
    registry: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
    controller: '0xfb3ce5d01e0f33f41dbb39035db9745962f1f968',
    name: 'Sepolia Testnet'
  }
};

// Contract ABIs
const REGISTRY_ABI = [
  { inputs: [{ name: 'node', type: 'bytes32' }], name: 'resolver', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'node', type: 'bytes32' }], name: 'owner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' }
];

const RESOLVER_ABI = [
  { inputs: [{ name: 'node', type: 'bytes32' }], name: 'addr', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'node', type: 'bytes32' }], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' }
];

export class ENSSDK {
  private internalNames: Map<string, InternalName> = new Map();
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private registries: Map<string, ethers.Contract> = new Map();

  constructor() {
    this.loadInternalNames();
  }

  /**
   * Initialize network connections
   */
  private async initNetwork(network: string): Promise<NetworkConfig> {
    const config = NETWORKS[network];
    if (!config) {
      throw new Error(`Unsupported network: ${network}`);
    }
    if (!config.rpc) {
      throw new Error(`Missing RPC URL for ${network}. Set ${network.toUpperCase()}_RPC_URL in .env`);
    }

    if (!this.providers.has(network)) {
      this.providers.set(network, new ethers.JsonRpcProvider(config.rpc));
    }

    if (!this.registries.has(network)) {
      const provider = this.providers.get(network)!;
      const registry = new ethers.Contract(config.registry, REGISTRY_ABI, provider);
      this.registries.set(network, registry);
    }

    return config;
  }

  /**
   * Namehash function for ENS names
   */
  private namehash(name: string): string {
    let node = '0x' + '00'.repeat(32);
    const labels = name.split('.').filter(Boolean);
    for (let i = labels.length - 1; i >= 0; i--) {
      const lh = ethers.keccak256(ethers.toUtf8Bytes(labels[i]));
      node = ethers.keccak256(ethers.solidityPacked(['bytes32', 'bytes32'], [node, lh]));
    }
    return node;
  }

  /**
   * Load internal names from localStorage
   */
  private loadInternalNames(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('ens-internal-names');
        if (stored) {
          const names: InternalName[] = JSON.parse(stored);
          names.forEach(name => {
            this.internalNames.set(name.name.toLowerCase(), name);
          });
        }
      } catch (e) {
        console.warn('Failed to load internal names:', e);
      }
    }
  }

  /**
   * Save internal names to localStorage
   */
  private saveInternalNames(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const names = Array.from(this.internalNames.values());
        localStorage.setItem('ens-internal-names', JSON.stringify(names));
      } catch (e) {
        console.warn('Failed to save internal names:', e);
      }
    }
  }

  /**
   * Register an internal name (contract, transaction, event)
   */
  public registerInternalName(
    name: string, 
    address: string, 
    type: 'contract' | 'transaction' | 'event',
    network: string = 'mainnet'
  ): void {
    const internalName: InternalName = {
      type,
      address,
      name: name.toLowerCase(),
      network,
      timestamp: Date.now()
    };

    this.internalNames.set(name.toLowerCase(), internalName);
    this.saveInternalNames();
  }

  /**
   * Resolve a name to address (ENS or internal)
   */
  public async resolve(name: string, network: string = 'mainnet'): Promise<ENSResult | null> {
    const normalizedName = name.toLowerCase();

    // Check internal names first
    const internalName = this.internalNames.get(normalizedName);
    if (internalName) {
      return {
        name: internalName.name,
        address: internalName.address,
        network: internalName.network,
        isInternal: true,
        type: internalName.type
      };
    }

    // Try ENS resolution
    try {
      const config = await this.initNetwork(network);
      const registry = this.registries.get(network)!;
      
      const node = this.namehash(normalizedName);
      const resolverAddr = await registry.resolver(node);
      
      if (resolverAddr === ethers.ZeroAddress) {
        return null;
      }

      const resolver = new ethers.Contract(resolverAddr, RESOLVER_ABI, this.providers.get(network)!);
      const address = await resolver.addr(node);
      
      if (address === ethers.ZeroAddress) {
        return null;
      }

      return {
        name: normalizedName,
        address,
        network,
        isInternal: false
      };
    } catch (e) {
      console.warn(`ENS resolution failed for ${name} on ${network}:`, e);
      return null;
    }
  }

  /**
   * Reverse resolve an address to name (ENS or internal)
   */
  public async reverse(address: string, network: string = 'mainnet'): Promise<ENSResult | null> {
    // Check internal names first
    for (const [name, internalName] of this.internalNames) {
      if (internalName.address.toLowerCase() === address.toLowerCase()) {
        return {
          name: internalName.name,
          address: internalName.address,
          network: internalName.network,
          isInternal: true,
          type: internalName.type
        };
      }
    }

    // Try ENS reverse resolution
    try {
      const config = await this.initNetwork(network);
      const registry = this.registries.get(network)!;
      
      // Get reverse node for addr.reverse
      const ADDR_REVERSE_NODE = '0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2';
      const reverseNode = ethers.keccak256(
        ethers.solidityPacked(['bytes32', 'bytes32'], [ADDR_REVERSE_NODE, ethers.keccak256(ethers.getBytes(address))])
      );
      
      const resolverAddr = await registry.resolver(reverseNode);
      if (resolverAddr === ethers.ZeroAddress) {
        return null;
      }

      const resolver = new ethers.Contract(resolverAddr, RESOLVER_ABI, this.providers.get(network)!);
      const name = await resolver.name(reverseNode);
      
      if (!name || name === '') {
        return null;
      }

      return {
        name,
        address,
        network,
        isInternal: false
      };
    } catch (e) {
      console.warn(`ENS reverse resolution failed for ${address} on ${network}:`, e);
      return null;
    }
  }

  /**
   * Get all internal names
   */
  public getInternalNames(): InternalName[] {
    return Array.from(this.internalNames.values());
  }

  /**
   * Get internal names by type
   */
  public getInternalNamesByType(type: 'contract' | 'transaction' | 'event'): InternalName[] {
    return Array.from(this.internalNames.values()).filter(name => name.type === type);
  }

  /**
   * Remove an internal name
   */
  public removeInternalName(name: string): boolean {
    const normalizedName = name.toLowerCase();
    const removed = this.internalNames.delete(normalizedName);
    if (removed) {
      this.saveInternalNames();
    }
    return removed;
  }

  /**
   * Clear all internal names
   */
  public clearInternalNames(): void {
    this.internalNames.clear();
    this.saveInternalNames();
  }

  /**
   * Test network connection
   */
  public async testNetwork(network: string = 'mainnet'): Promise<boolean> {
    try {
      const config = await this.initNetwork(network);
      const provider = this.providers.get(network)!;
      const networkInfo = await provider.getNetwork();
      console.log(`✅ Connected to ${config.name} (Chain ID: ${Number(networkInfo.chainId)})`);
      return true;
    } catch (e) {
      console.error(`❌ Failed to connect to ${network}:`, e);
      return false;
    }
  }
}

// Export singleton instance
export const ensSDK = new ENSSDK();

// Export individual functions for convenience
export const resolve = (name: string, network?: string) => ensSDK.resolve(name, network);
export const reverse = (address: string, network?: string) => ensSDK.reverse(address, network);
export const registerInternal = (name: string, address: string, type: 'contract' | 'transaction' | 'event', network?: string) => 
  ensSDK.registerInternalName(name, address, type, network);
export const getInternalNames = () => ensSDK.getInternalNames();
export const getInternalNamesByType = (type: 'contract' | 'transaction' | 'event') => ensSDK.getInternalNamesByType(type);
export const removeInternal = (name: string) => ensSDK.removeInternalName(name);
export const clearInternal = () => ensSDK.clearInternalNames();
export const testNetwork = (network?: string) => ensSDK.testNetwork(network);
