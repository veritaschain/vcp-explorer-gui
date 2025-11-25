import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Search,
  ArrowRight,
  Activity,
  Database,
  Shield,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { vcpClient } from '@/lib/api-client';
import { formatDate, formatNumber, getEventTypeColor, getEventTypeBgColor } from '@/lib/utils';
import { EventTypeBadge } from '@/components/features/EventTypeBadge';
import { StatusBadge } from '@/components/features/StatusBadge';
import type { EventType } from '@/types/vcp';

export function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch system status
  const { data: systemStatus } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: () => vcpClient.getSystemStatus(),
    refetchInterval: 30000,
  });

  // Fetch recent events
  const { data: recentEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['recentEvents'],
    queryFn: () => vcpClient.searchEvents({ limit: 10 }),
    refetchInterval: 10000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-vcp-800/50 to-vcp-900/50 border border-vcp-700/30 p-8">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-vcp-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-verify-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            VCP Explorer
          </h1>
          <p className="text-vcp-300 mb-6 max-w-2xl">
            Search, verify, and explore VeritasChain Protocol events. 
            Cryptographic audit trails for algorithmic trading systems.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-vcp-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Event ID, Trace ID, Symbol, or Hash..."
                className="w-full pl-12 pr-32 py-4 bg-vcp-900/80 border border-vcp-700/50 rounded-xl
                         text-white placeholder-vcp-500
                         focus:outline-none focus:ring-2 focus:ring-vcp-500/50 focus:border-vcp-500
                         transition-all duration-200"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2
                         bg-vcp-600 hover:bg-vcp-500 text-white font-medium rounded-lg
                         transition-all duration-200"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick Search Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-xs text-vcp-500">Quick search:</span>
            {['XAUUSD', 'EURUSD', 'BTCUSDT', 'SIG', 'ORD', 'EXE'].map((tag) => (
              <button
                key={tag}
                onClick={() => navigate(`/search?q=${tag}`)}
                className="px-2.5 py-1 text-xs font-medium text-vcp-300 bg-vcp-800/50 
                         border border-vcp-700/30 rounded-full hover:bg-vcp-700/50 
                         hover:border-vcp-600/50 transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Database}
          label="Total Events"
          value={systemStatus ? formatNumber(systemStatus.total_events) : '---'}
          subtext="VCP v1.0 Events"
          color="blue"
        />
        <StatCard
          icon={Activity}
          label="Active Nodes"
          value={systemStatus?.active_nodes?.toString() || '---'}
          subtext="Distributed Network"
          color="green"
        />
        <StatCard
          icon={Shield}
          label="Certification Tier"
          value={systemStatus?.tier || '---'}
          subtext="System Level"
          color="purple"
        />
        <StatCard
          icon={Clock}
          label="Precision"
          value={systemStatus?.precision || '---'}
          subtext="Timestamp Accuracy"
          color="amber"
        />
      </div>

      {/* Recent Events & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Events */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-vcp-400" />
              Recent Events
            </h2>
            <Link
              to="/search"
              className="text-sm text-vcp-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {eventsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-vcp-800/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {recentEvents?.events.map((event) => (
                <Link
                  key={event.event_id}
                  to={`/events/${event.event_id}`}
                  className="flex items-center gap-4 p-3 bg-vcp-800/30 hover:bg-vcp-800/50 
                           rounded-lg transition-all group"
                >
                  <EventTypeBadge type={event.type as EventType} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-white truncate">
                        {event.event_id.substring(0, 18)}...
                      </span>
                      <span className="text-xs text-vcp-500">{event.symbol}</span>
                    </div>
                    <span className="text-xs text-vcp-500">
                      {formatDate(event.timestamp)}
                    </span>
                  </div>

                  <StatusBadge status={event.status} />
                  
                  <ArrowRight className="w-4 h-4 text-vcp-500 opacity-0 group-hover:opacity-100 
                                       transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Last Anchor */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-verify-400" />
            Last Anchor
          </h2>

          {systemStatus?.last_anchor ? (
            <div className="space-y-4">
              <div className="p-4 bg-verify-500/10 border border-verify-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-verify-400" />
                  <span className="text-sm font-medium text-verify-400">Anchored</span>
                </div>
                <p className="text-xs text-vcp-400">
                  Successfully anchored to {systemStatus.last_anchor.network}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-xs text-vcp-500 uppercase tracking-wider">Network</span>
                  <p className="text-sm text-white font-mono mt-1">
                    {systemStatus.last_anchor.network}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-vcp-500 uppercase tracking-wider">Block Number</span>
                  <p className="text-sm text-white font-mono mt-1">
                    #{formatNumber(systemStatus.last_anchor.block_number)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-vcp-500 uppercase tracking-wider">TX Hash</span>
                  <p className="text-xs text-vcp-300 font-mono mt-1 truncate">
                    {systemStatus.last_anchor.tx_hash}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-vcp-500 uppercase tracking-wider">Anchored At</span>
                  <p className="text-sm text-white mt-1">
                    {formatDate(systemStatus.last_anchor.anchored_at)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-4 bg-anomaly-500/10 border border-anomaly-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-anomaly-400" />
              <span className="text-sm text-anomaly-400">Loading anchor data...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: typeof Database;
  label: string;
  value: string;
  subtext: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}

function StatCard({ icon: Icon, label, value, subtext, color }: StatCardProps) {
  const colorClasses = {
    blue: 'from-vcp-500/20 to-vcp-600/10 border-vcp-500/30 text-vcp-400',
    green: 'from-verify-500/20 to-verify-600/10 border-verify-500/30 text-verify-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    amber: 'from-anomaly-500/20 to-anomaly-600/10 border-anomaly-500/30 text-anomaly-400',
  };

  return (
    <div className={`glass-card p-5 bg-gradient-to-br ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-vcp-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-vcp-500 mt-1">{subtext}</p>
        </div>
        <Icon className={`w-6 h-6 ${colorClasses[color].split(' ').pop()}`} />
      </div>
    </div>
  );
}
