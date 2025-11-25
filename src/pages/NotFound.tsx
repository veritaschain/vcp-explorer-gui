import { Link } from 'react-router-dom';
import { Home, Search, AlertCircle, ArrowLeft } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        {/* 404 Visual */}
        <div className="relative mb-8">
          <div className="text-[150px] font-bold text-vcp-900 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertCircle className="w-24 h-24 text-vcp-600" />
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-vcp-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
          This might be an invalid Event ID or an incorrect URL.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/"
            className="btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link
            to="/search"
            className="btn-secondary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Search className="w-4 h-4" />
            Search Events
          </Link>
        </div>

        {/* Go Back */}
        <button
          onClick={() => window.history.back()}
          className="mt-6 text-sm text-vcp-400 hover:text-white inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Go back
        </button>

        {/* Help Text */}
        <div className="mt-12 p-4 bg-vcp-900/50 rounded-lg border border-vcp-800">
          <h3 className="text-sm font-semibold text-white mb-2">Looking for an event?</h3>
          <p className="text-xs text-vcp-400">
            VCP Event IDs use UUID v7 format. Make sure the ID is correct and try searching again.
            Example: <code className="text-vcp-300">01934e3a-7b2c-7f93-8f2a-1234567890ab</code>
          </p>
        </div>
      </div>
    </div>
  );
}
