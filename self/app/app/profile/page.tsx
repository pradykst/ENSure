"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Protected from "../../components/Protected";

export default function ProfilePage() {
  const [address, setAddress] = useState<string>("");

  useEffect(() => {
    const getAddress = async () => {
      if (window.ethereum) {
        const [account] = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAddress(account);
      }
    };
    getAddress();
  }, []);

  return (
    <Protected>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="bg-white rounded-xl shadow p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-2xl">✓</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Verification Complete!
              </h1>
              <p className="text-gray-600">
                Your identity has been successfully verified with Self Protocol.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">Your Profile</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Wallet Address:</span>
                  <p className="text-sm text-gray-900 break-all">{address}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Verification Status:</span>
                  <p className="text-sm text-green-600 font-medium">✓ Verified</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Network:</span>
                  <p className="text-sm text-gray-900">Celo Sepolia</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Available Actions</h2>
              <div className="grid gap-4">
                <Link 
                  href="/register"
                  className="block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-center"
                >
                  Register for Services
                </Link>
                <Link 
                  href="/events/create"
                  className="block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 text-center"
                >
                  Create Event
                </Link>
                <Link 
                  href="/"
                  className="block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 text-center"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Protected>
  );
}
