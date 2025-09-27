"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Protected from "../../components/Protected";

export default function RegisterPage() {
  const [address, setAddress] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    interests: ""
  });

  useEffect(() => {
    const getAddress = async () => {
      if (window.ethereum) {
        const [account] = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAddress(account);
      }
    };
    getAddress();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle registration logic here
    alert("Registration submitted! (This is a demo)");
  };

  return (
    <Protected>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="bg-white rounded-xl shadow p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Register for Services
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-2">
                  Interests
                </label>
                <textarea
                  id="interests"
                  value={formData.interests}
                  onChange={(e) => setFormData({...formData, interests: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us about your interests..."
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Connected Wallet:</strong> {address}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  ✓ Identity verified with Self Protocol
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Register
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/profile" className="text-blue-600 hover:text-blue-800">
                Back to Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Protected>
  );
}
