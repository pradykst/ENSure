/**
 * EventEscrow Integration Example
 * 
 * This file shows how to integrate the ENS SDK with your EventEscrow contract
 * for naming and resolving contracts, transactions, and events
 */

import { ensSDK, registerInternal, resolve, reverse } from './index';

export class EventEscrowNaming {
  private ensSDK = ensSDK;

  /**
   * Register a new event with its contract address
   */
  async registerEvent(
    eventName: string, 
    contractAddress: string, 
    network: string = 'mainnet'
  ): Promise<void> {
    // Register the event contract
    registerInternal(eventName, contractAddress, 'contract', network);
    
    console.log(`✅ Event "${eventName}" registered at ${contractAddress}`);
  }

  /**
   * Register a transaction hash for an event
   */
  async registerTransaction(
    eventName: string,
    txHash: string,
    network: string = 'mainnet'
  ): Promise<void> {
    const txName = `${eventName}-deploy`;
    registerInternal(txName, txHash, 'transaction', network);
    
    console.log(`✅ Transaction "${txName}" registered: ${txHash}`);
  }

  /**
   * Register an event instance (specific event occurrence)
   */
  async registerEventInstance(
    eventName: string,
    instanceId: string,
    network: string = 'mainnet'
  ): Promise<void> {
    const instanceName = `${eventName}-${instanceId}`;
    registerInternal(instanceName, instanceId, 'event', network);
    
    console.log(`✅ Event instance "${instanceName}" registered`);
  }

  /**
   * Resolve a name to address (supports both ENS and internal names)
   */
  async resolveName(nameOrAddress: string, network: string = 'mainnet'): Promise<string | null> {
    // If it's already an address, return it
    if (nameOrAddress.startsWith('0x') && nameOrAddress.length === 42) {
      return nameOrAddress;
    }

    // Try to resolve the name
    const result = await this.ensSDK.resolve(nameOrAddress, network);
    if (result) {
      return result.address;
    }

    return null;
  }

  /**
   * Get a human-readable name for an address
   */
  async getDisplayName(address: string, network: string = 'mainnet'): Promise<string> {
    // Try reverse resolution
    const result = await this.ensSDK.reverse(address, network);
    if (result) {
      return result.name;
    }

    // Return shortened address if no name found
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Get all registered events
   */
  getRegisteredEvents(): Array<{name: string, address: string, type: string}> {
    const internalNames = this.ensSDK.getInternalNames();
    return internalNames
      .filter(name => name.type === 'contract')
      .map(name => ({
        name: name.name,
        address: name.address,
        type: name.type
      }));
  }

  /**
   * Get all transactions for an event
   */
  getEventTransactions(eventName: string): Array<{name: string, hash: string}> {
    const internalNames = this.ensSDK.getInternalNames();
    return internalNames
      .filter(name => name.type === 'transaction' && name.name.startsWith(eventName))
      .map(name => ({
        name: name.name,
        hash: name.address
      }));
  }

  /**
   * Complete event setup (contract + transaction)
   */
  async setupEvent(
    eventName: string,
    contractAddress: string,
    txHash?: string,
    network: string = 'mainnet'
  ): Promise<void> {
    // Register the event contract
    await this.registerEvent(eventName, contractAddress, network);
    
    // Register transaction if provided
    if (txHash) {
      await this.registerTransaction(eventName, txHash, network);
    }
    
    console.log(`🎉 Event "${eventName}" fully set up!`);
  }
}

// Usage example
export async function exampleUsage() {
  const naming = new EventEscrowNaming();
  
  // Setup a new event
  await naming.setupEvent(
    'ethglobal-hackathon',
    '0x1234567890123456789012345678901234567890',
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    'mainnet'
  );
  
  // Register an event instance
  await naming.registerEventInstance('ethglobal-hackathon', 'instance-001');
  
  // Resolve names
  const contractAddr = await naming.resolveName('ethglobal-hackathon');
  console.log('Contract address:', contractAddr);
  
  // Get display name
  const displayName = await naming.getDisplayName(contractAddr!);
  console.log('Display name:', displayName);
  
  // List all events
  const events = naming.getRegisteredEvents();
  console.log('Registered events:', events);
}

// Export for use in other files
export { EventEscrowNaming };
