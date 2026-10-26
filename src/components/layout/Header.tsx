import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Shield, Bell, Settings, ExternalLink, Menu, X } from 'lucide-react';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-vcp-900/95 backdrop-blur-lg border-b border-vcp-800/50">
      <div className="flex h-full items-center justify-between gap-2 px-3 sm:px-6">
        {/* Mobile navigation remains available when the desktop sidebar is hidden. */}
        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-controls="mobile-navigation"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex-shrink-0 rounded-lg p-2 text-vcp-300 hover:bg-vcp-800/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-vcp-300 lg:hidden"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Logo */}
        <Link to="/" onClick={() => setMobileMenuOpen(false)} className="group flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="relative">
            <Shield className="w-8 h-8 text-vcp-400 group-hover:text-vcp-300 transition-colors" />
            <div className="absolute inset-0 bg-vcp-400/20 blur-lg group-hover:bg-vcp-300/30 transition-all" />
          </div>
          <div className="flex flex-col">
            <span className="whitespace-nowrap text-base font-bold tracking-tight text-white sm:text-lg">
              VCP <span className="text-vcp-400">Explorer</span>
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-vcp-500 sm:block">
              VeritasChain Protocol
            </span>
          </div>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mx-4 hidden min-w-0 max-w-xl flex-1 lg:block xl:mx-8">
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
        <div className="hidden items-center gap-2 lg:flex xl:gap-4">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 rounded-full border border-vcp-600/30 bg-vcp-700/20 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-vcp-400" />
            <span className="text-xs font-medium text-vcp-300">Demo</span>
          </div>

          {/* External Links */}
          <a
            href="https://docs.veritaschain.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 text-sm text-vcp-400 transition-colors hover:text-white xl:flex"
          >
            Docs
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Notifications */}
          <button className="hidden rounded-lg p-2 text-vcp-400 transition-all hover:bg-vcp-800/50 hover:text-white xl:block">
            <Bell className="w-5 h-5" />
          </button>

          {/* Settings */}
          <button className="hidden rounded-lg p-2 text-vcp-400 transition-all hover:bg-vcp-800/50 hover:text-white xl:block">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        aria-hidden={!mobileMenuOpen}
        className={mobileMenuOpen
          ? 'absolute inset-x-0 top-16 border-b border-vcp-700 bg-vcp-900 p-4 shadow-xl lg:hidden'
          : 'hidden'}
      >
        {[
          ['Dashboard', '/'],
          ['Search Events', '/search'],
          ['Hash Chain', '/chain'],
          ['Merkle Proofs', '/search?view=proofs'],
          ['Certificates', '/search?view=certificates'],
        ].map(([label, href]) => (
          <Link
            key={href}
            to={href}
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-3 py-3 text-sm font-medium text-white hover:bg-vcp-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-vcp-300"
          >
            {label}
          </Link>
        ))}
        <p className="mt-3 border-t border-vcp-800 pt-3 text-xs text-vcp-300">
          VCP v1.2 · Demo data — not verified
        </p>
      </nav>
    </header>
  );
}
