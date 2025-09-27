/**
 * ENS SDK - Main Export
 * 
 * This file provides easy imports for the ENS SDK from anywhere in the ENSure project
 */

// Export the main SDK (Node.js compatible)
export * from './src/ens-sdk';

// Export the browser-compatible SDK
export * from './src/browser-sdk';

// Export the EventEscrow integration
export * from './src/event-escrow-integration';

// Re-export for convenience
export { ensSDK as default } from './src/browser-sdk';
