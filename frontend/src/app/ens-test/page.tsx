'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ensSDK, resolve, reverse, registerInternal, getInternalNames, removeInternal, clearInternal, testNetwork, getTextRecord, getAllRecords } from '@/lib/ens-sdk';

export default function ENSTestPage() {
  const [results, setResults] = useState<any[]>([]);
  const [internalNames, setInternalNames] = useState<any[]>([]);
  const [resolveName, setResolveName] = useState('');
  const [reverseAddress, setReverseAddress] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerAddress, setRegisterAddress] = useState('');
  const [registerType, setRegisterType] = useState<'contract' | 'transaction' | 'event'>('contract');
  const [network, setNetwork] = useState('mainnet');

  useEffect(() => {
    loadInternalNames();
  }, []);

  const loadInternalNames = () => {
    setInternalNames(getInternalNames());
  };

  const addResult = (operation: string, result: any) => {
    setResults(prev => [...prev, {
      id: Date.now(),
      operation,
      result,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const handleResolve = async () => {
    if (!resolveName) return;
    
    try {
      const result = await resolve(resolveName, network);
      addResult(`Resolve "${resolveName}"`, result);
    } catch (error: any) {
      addResult(`Resolve "${resolveName}"`, { error: error.message });
    }
  };

  const handleReverse = async () => {
    if (!reverseAddress) return;
    
    try {
      const result = await reverse(reverseAddress, network);
      addResult(`Reverse "${reverseAddress}"`, result);
    } catch (error: any) {
      addResult(`Reverse "${reverseAddress}"`, { error: error.message });
    }
  };

  const handleRegister = () => {
    if (!registerName || !registerAddress) return;
    
    registerInternal(registerName, registerAddress, registerType, network);
    addResult(`Register "${registerName}"`, {
      name: registerName,
      address: registerAddress,
      type: registerType,
      network
    });
    loadInternalNames();
    
    // Clear form
    setRegisterName('');
    setRegisterAddress('');
  };

  const handleRemove = (name: string) => {
    const removed = removeInternal(name);
    addResult(`Remove "${name}"`, { removed });
    loadInternalNames();
  };

  const handleClearAll = () => {
    clearInternal();
    addResult('Clear All', { cleared: true });
    loadInternalNames();
  };

  const handleTestNetwork = async () => {
    const connected = await testNetwork(network);
    addResult(`Test Network "${network}"`, { connected });
  };

  const handleGetAllRecords = async () => {
    if (!resolveName) return;
    
    try {
      const records = await getAllRecords(resolveName, network);
      addResult(`Get All Records "${resolveName}"`, { 
        name: resolveName,
        records,
        count: Object.keys(records).length
      });
    } catch (error: any) {
      addResult(`Get All Records "${resolveName}"`, { error: error.message });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ENS SDK Testing Interface</h1>
        <p className="text-gray-600">Test ENS resolution, reverse resolution, and internal naming system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Controls */}
        <div className="space-y-6">
          {/* Network Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Network Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="network">Network</Label>
                  <select
                    id="network"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="mainnet">Mainnet</option>
                    <option value="holesky">Holesky</option>
                    <option value="sepolia">Sepolia</option>
                  </select>
                </div>
                <Button onClick={handleTestNetwork} className="w-full">
                  Test Network Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ENS Resolution */}
          <Card>
            <CardHeader>
              <CardTitle>ENS Resolution</CardTitle>
              <CardDescription>Resolve ENS names to addresses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="resolveName">ENS Name</Label>
                  <Input
                    id="resolveName"
                    placeholder="vitalik.eth"
                    value={resolveName}
                    onChange={(e) => setResolveName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleResolve} className="flex-1">
                    Resolve Name
                  </Button>
                  <Button onClick={handleGetAllRecords} variant="outline" className="flex-1">
                    Get All Records
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reverse Resolution */}
          <Card>
            <CardHeader>
              <CardTitle>Reverse Resolution</CardTitle>
              <CardDescription>Resolve addresses to ENS names</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reverseAddress">Address</Label>
                  <Input
                    id="reverseAddress"
                    placeholder="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
                    value={reverseAddress}
                    onChange={(e) => setReverseAddress(e.target.value)}
                  />
                </div>
                <Button onClick={handleReverse} className="w-full">
                  Reverse Resolve
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Internal Naming */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Naming</CardTitle>
              <CardDescription>Register contracts, transactions, and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="registerName">Name</Label>
                  <Input
                    id="registerName"
                    placeholder="ethglobal-escrow"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="registerAddress">Address/Hash</Label>
                  <Input
                    id="registerAddress"
                    placeholder="0x1234567890123456789012345678901234567890"
                    value={registerAddress}
                    onChange={(e) => setRegisterAddress(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="registerType">Type</Label>
                  <select
                    id="registerType"
                    value={registerType}
                    onChange={(e) => setRegisterType(e.target.value as any)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="contract">Contract</option>
                    <option value="transaction">Transaction</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <Button onClick={handleRegister} className="w-full">
                  Register Internal Name
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>SDK operation results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-gray-500">No operations yet</p>
                ) : (
                  results.map((result) => (
                    <div key={result.id} className="p-3 border rounded bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{result.operation}</span>
                        <span className="text-xs text-gray-500">{result.timestamp}</span>
                      </div>
                      {result.operation.includes('Get All Records') && result.result?.records ? (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Found {result.result.count} records:</div>
                          <div className="grid grid-cols-1 gap-2">
                            {Object.entries(result.result.records).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                                <span className="font-medium text-blue-800">{key}:</span>
                                <span className="text-blue-600 text-sm">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Internal Names */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Names</CardTitle>
              <CardDescription>Registered internal names</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {internalNames.length === 0 ? (
                  <p className="text-gray-500">No internal names registered</p>
                ) : (
                  internalNames.map((name, index) => (
                    <div key={index} className="p-3 border rounded bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium">{name.name}</span>
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {name.type}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemove(name.name)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {name.address}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(name.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
                {internalNames.length > 0 && (
                  <Button
                    onClick={handleClearAll}
                    variant="destructive"
                    className="w-full mt-4"
                  >
                    Clear All Internal Names
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Test Examples */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Test Examples</CardTitle>
          <CardDescription>Try these examples to test the SDK</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">ENS Resolution Examples:</h4>
              <ul className="text-sm space-y-1">
                <li>• vitalik.eth (has Twitter, GitHub, etc.)</li>
                <li>• ethereum.eth (has website, description)</li>
                <li>• ens.eth (has website, social links)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Available Records:</h4>
              <ul className="text-sm space-y-1">
                <li>• description, url, avatar</li>
                <li>• twitter, github, discord</li>
                <li>• email, location, timezone</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
