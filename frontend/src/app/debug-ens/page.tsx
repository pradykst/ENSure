'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ensSDK, resolve, reverse, testNetwork } from '@/lib/ens-sdk';

export default function DebugENSPage() {
  const [results, setResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (operation: string, result: any) => {
    setResults(prev => [...prev, {
      id: Date.now(),
      operation,
      result,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testMainnetConnection = async () => {
    setTesting(true);
    try {
      console.log('Testing mainnet connection...');
      const connected = await testNetwork('mainnet');
      addResult('Mainnet Connection Test', { 
        connected, 
        rpc: 'https://cloudflare-eth.com',
        message: connected ? '✅ Connected successfully' : '❌ Connection failed'
      });
    } catch (error: any) {
      addResult('Mainnet Connection Test', { 
        connected: false, 
        error: error.message,
        message: '❌ Connection failed'
      });
    }
    setTesting(false);
  };

  const testENSResolution = async () => {
    setTesting(true);
    try {
      console.log('Testing ENS resolution...');
      const result = await resolve('vitalik.eth', 'mainnet');
      addResult('ENS Resolution Test', { 
        name: 'vitalik.eth',
        result,
        message: result ? '✅ Resolution successful' : '❌ Resolution failed'
      });
    } catch (error: any) {
      addResult('ENS Resolution Test', { 
        name: 'vitalik.eth',
        error: error.message,
        message: '❌ Resolution failed'
      });
    }
    setTesting(false);
  };

  const testReverseResolution = async () => {
    setTesting(true);
    try {
      console.log('Testing reverse resolution...');
      const result = await reverse('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 'mainnet');
      addResult('Reverse Resolution Test', { 
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        result,
        message: result ? '✅ Reverse resolution successful' : '❌ Reverse resolution failed'
      });
    } catch (error: any) {
      addResult('Reverse Resolution Test', { 
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        error: error.message,
        message: '❌ Reverse resolution failed'
      });
    }
    setTesting(false);
  };

  const runAllTests = async () => {
    setTesting(true);
    await testMainnetConnection();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await testENSResolution();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await testReverseResolution();
    setTesting(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ENS SDK Debug Page</h1>
        <p className="text-gray-600">Debug mainnet ENS resolution issues</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
            <CardDescription>Run individual tests or all tests at once</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testMainnetConnection} 
              disabled={testing}
              className="w-full"
            >
              {testing ? 'Testing...' : 'Test Mainnet Connection'}
            </Button>
            
            <Button 
              onClick={testENSResolution} 
              disabled={testing}
              className="w-full"
            >
              {testing ? 'Testing...' : 'Test ENS Resolution (vitalik.eth)'}
            </Button>
            
            <Button 
              onClick={testReverseResolution} 
              disabled={testing}
              className="w-full"
            >
              {testing ? 'Testing...' : 'Test Reverse Resolution'}
            </Button>
            
            <Button 
              onClick={runAllTests} 
              disabled={testing}
              variant="default"
              className="w-full"
            >
              {testing ? 'Running All Tests...' : 'Run All Tests'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Debug information and test results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-gray-500">No tests run yet</p>
              ) : (
                results.map((result) => (
                  <div key={result.id} className="p-3 border rounded bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{result.operation}</span>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                    <div className="text-sm mb-2">{result.message}</div>
                    <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                      {JSON.stringify(result.result || result.error, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
          <CardDescription>Current configuration and troubleshooting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">RPC Configuration:</h4>
              <ul className="text-sm space-y-1">
                <li>• Mainnet: https://cloudflare-eth.com (fallback)</li>
                <li>• Holesky: https://ethereum-holesky.publicnode.com</li>
                <li>• Sepolia: https://ethereum-sepolia.publicnode.com</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Troubleshooting:</h4>
              <ul className="text-sm space-y-1">
                <li>• Check browser console for errors</li>
                <li>• Verify network connectivity</li>
                <li>• Try different RPC providers</li>
                <li>• Check ENS registry status</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
