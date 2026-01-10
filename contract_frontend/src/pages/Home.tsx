import React, { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link } from "react-router-dom";
import { formatEther } from "viem";
import { getTokenLabel } from "../lib/constants";

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("Error fetching events", e);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="container mx-auto px-6 py-24 relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Build. Ship. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Win On-Chain.
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mb-10">
            The decentralized event orchestration layer for Rootstock. 
            Create hackathons, bounties, and competitions with trustless prize distribution.
          </p>
          <div className="flex gap-4">
            <Link to="/create" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-full font-bold text-lg transition-all shadow-lg shadow-indigo-500/25">
              Create Event
            </Link>
            <a href="#events" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full font-bold text-lg transition-all">
              Explore Active
            </a>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div id="events" className="container mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold">Latest Events</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-900 rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => (
              <Link to={`/event/${evt.onChainId || evt.id}`} key={evt.id} className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/20">
                    {evt.token && evt.token !== "0x0000000000000000000000000000000000000000" ? "ERC-20" : "Native"}
                  </span>
                  <span className="text-slate-500 text-xs font-mono">ID: {evt.onChainId || "?"}</span>
                </div>
                
                <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-400 transition-colors">{evt.name}</h3>
                <p className="text-slate-400 text-sm mb-6 line-clamp-2">
                   Scope: {evt.scope || "Open scope event hosted on Rootstock."}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                   <div className="text-sm text-slate-400">
                      Ends: <span className="text-white">{new Date(evt.endDate).toLocaleDateString()}</span>
                   </div>
                   <div className="text-emerald-400 font-bold text-sm">
                      {/* Note: We assume depositAmount is stored in formatted or wei string in firebase for display */}
                      Active
                   </div>
                </div>
              </Link>
            ))}
            {events.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-500">
                No events found. Be the first to create one!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}