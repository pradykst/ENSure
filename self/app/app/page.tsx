import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to MyDapp
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A decentralized application with identity verification powered by Self Protocol.
            Verify your identity once and access all features.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-3">🔐 Identity Verification</h3>
            <p className="text-gray-600 mb-4">
              Verify your identity using Self Protocol to access protected features.
            </p>
            <Link 
              href="/verify"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Verify Now
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-3">📝 Registration</h3>
            <p className="text-gray-600 mb-4">
              Register for exclusive features and services (requires verification).
            </p>
            <Link 
              href="/register"
              className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Register
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-3">🎉 Events</h3>
            <p className="text-gray-600 mb-4">
              Create and manage events (requires verification).
            </p>
            <Link 
              href="/events/create"
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
            >
              Create Event
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Connect Wallet</h3>
              <p className="text-gray-600 text-sm">
                Connect your MetaMask wallet to Celo Sepolia network
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Verify Identity</h3>
              <p className="text-gray-600 text-sm">
                Complete identity verification using Self Protocol
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Access Features</h3>
              <p className="text-gray-600 text-sm">
                Unlock all protected features and services
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
