import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Hash routing is opt-in for static hosts that cannot serve deep SPA URLs.
// The Docker/root build retains BrowserRouter by default.
const useHashRouter = import.meta.env.VITE_ROUTER_MODE === 'hash';
const Router = useHashRouter ? HashRouter : BrowserRouter;
const basename = useHashRouter ? '/' : import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router basename={basename}>
        <App />
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);
