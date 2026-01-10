import { Link, useLocation } from "react-router-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function Navbar() {
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? "text-indigo-400" : "text-slate-400 hover:text-white";

  return (
    <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:shadow-indigo-500/20 transition-all">
            P
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            PrizeEscrow
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 font-medium text-sm">
          <Link to="/" className={`transition-colors ${isActive("/")}`}>Discovery</Link>
          <Link to="/create" className={`transition-colors ${isActive("/create")}`}>Create Event</Link>
        </div>

        <div>
          {address ? (
            <button 
              onClick={() => disconnect()}
              className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-full pl-2 pr-4 py-1.5 hover:border-slate-700 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" />
              <span className="text-slate-300 text-sm font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </button>
          ) : (
            <button 
              onClick={() => connect({ connector: connectors[0] })}
              className="px-5 py-2.5 bg-white text-slate-950 rounded-full font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}