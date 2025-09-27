'use client';
import { useState } from 'react';
import Protected from '@/components/Protected';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  description: string;
  prizePool: string;
  participants: number;
  maxParticipants: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'ended';
  tags: string[];
}

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'ETH Delhi Hackathon',
    description: 'Build the future of decentralized applications on Ethereum',
    prizePool: '50 ETH',
    participants: 156,
    maxParticipants: 200,
    startDate: '2024-01-15',
    endDate: '2024-01-17',
    status: 'active',
    tags: ['Ethereum', 'DeFi', 'NFTs']
  },
  {
    id: '2',
    title: 'Rootstock Innovation Challenge',
    description: 'Showcase Bitcoin-powered smart contract solutions',
    prizePool: '25 BTC',
    participants: 89,
    maxParticipants: 150,
    startDate: '2024-02-01',
    endDate: '2024-02-03',
    status: 'upcoming',
    tags: ['Bitcoin', 'Rootstock', 'Smart Contracts']
  },
  {
    id: '3',
    title: 'Self Protocol Identity Hackathon',
    description: 'Build privacy-preserving identity solutions',
    prizePool: '10,000 USDC',
    participants: 67,
    maxParticipants: 100,
    startDate: '2024-01-01',
    endDate: '2024-01-05',
    status: 'ended',
    tags: ['Identity', 'Privacy', 'ZK-Proofs']
  }
];

export default function EventsPage() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'active' | 'ended'>('all');

  const filteredEvents = filter === 'all' 
    ? mockEvents 
    : mockEvents.filter(event => event.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ended': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Protected>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Events</h1>
              <p className="text-gray-600 mt-2">Discover hackathons and competitions for verified humans</p>
            </div>
            <Link 
              href="/events/create" 
              className="btn-brand"
            >
              Create Event
            </Link>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-8 overflow-x-auto">
            {(['all', 'active', 'upcoming', 'ended'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === status
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Events Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                      {event.status}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{event.prizePool}</div>
                      <div className="text-xs text-gray-500">Prize Pool</div>
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>

                  <div className="flex justify-between text-xs text-gray-500 mb-4">
                    <span>{event.startDate} - {event.endDate}</span>
                    <span>{event.participants}/{event.maxParticipants} participants</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {event.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Link 
                      href={`/events/${event.id}`}
                      className="flex-1 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 text-center"
                    >
                      View Details
                    </Link>
                    {event.status === 'active' && (
                      <button className="px-4 py-2 border border-primary text-primary text-sm font-medium rounded-xl hover:bg-primary/5">
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🎫</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600">Try adjusting your filters or check back later for new events.</p>
            </div>
          )}
        </div>
      </div>
    </Protected>
  );
}
