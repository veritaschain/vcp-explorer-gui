import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isEvidenceDemo = useLocation().pathname === '/evidence-demo';
  return (
    <div className="min-h-screen min-w-0 bg-vcp-950 grid-bg">
      {/* Header */}
      <Header />
      
      {/* Main content area */}
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content */}
        <main className="min-w-0 flex-1 pt-16 lg:ml-64">
          <div className="mx-auto min-w-0 max-w-7xl px-3 py-4 sm:p-6">
            <p className="mb-4 rounded-lg border border-anomaly-500/30 bg-anomaly-500/10 px-4 py-3 text-sm text-anomaly-200 print:hidden">
              {isEvidenceDemo
                ? 'Synthetic evidence — limited local verification. No external anchor or certification is established.'
                : 'Demo data — not verified. Displayed anchors, tiers and certificates do not establish on-chain anchoring or certification.'}
            </p>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
