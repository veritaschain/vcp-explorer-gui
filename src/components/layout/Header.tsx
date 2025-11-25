import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Shield, Bell, Settings, ExternalLink } from 'lucide-react';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-vcp-900/95 backdrop-blur-lg border-b border-vcp-800/50">
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <Shield className="w-8 h-8 text-vcp-400 group-hover:text-vcp-300 transition-colors" />
            <div className="absolute inset-0 bg-vcp-400/20 blur-lg group-hover:bg-vcp-300/30 transition-all" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white tracking-tight">
              VCP <span className="text-vcp-400">Explorer</span>
            </span>
            <span className="text-[10px] text-vcp-500 font-medium tracking-wider uppercase">
              VeritasChain Protocol
            </span>
          </div>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vcp-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Event ID, Trace ID, Symbol, or Hash..."
              className="w-full pl-10 pr-4 py-2 bg-vcp-800/50 border border-vcp-700/50 rounded-lg
                       text-sm text-white placeholder-vcp-500
                       focus:outline-none focus:ring-2 focus:ring-vcp-500/50 focus:border-vcp-500
                       transition-all duration-200"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-block
                          px-1.5 py-0.5 text-xs font-mono text-vcp-500 bg-vcp-800 rounded">
              ⌘K
            </kbd>
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-verify-500/10 border border-verify-500/20 rounded-full">
            <div className="w-2 h-2 bg-verify-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-verify-400">Live</span>
          </div>

          {/* External Links */}
          <a
            href="https://docs.veritaschain.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-vcp-400 hover:text-white transition-colors"
          >
            Docs
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Notifications */}
          <button className="p-2 text-vcp-400 hover:text-white hover:bg-vcp-800/50 rounded-lg transition-all">
            <Bell className="w-5 h-5" />
          </button>

          {/* Settings */}
          <button className="p-2 text-vcp-400 hover:text-white hover:bg-vcp-800/50 rounded-lg transition-all">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
