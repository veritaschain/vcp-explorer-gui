import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
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
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
