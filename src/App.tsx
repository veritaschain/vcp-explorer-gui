import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { EventDetail } from '@/pages/EventDetail';
import { MerkleProofPage } from '@/pages/MerkleProofPage';
import { CertificatePage } from '@/pages/CertificatePage';
import { HashChainPage } from '@/pages/HashChainPage';
import { SearchPage } from '@/pages/SearchPage';
import { NotFound } from '@/pages/NotFound';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/events/:eventId" element={<EventDetail />} />
        <Route path="/events/:eventId/proof" element={<MerkleProofPage />} />
        <Route path="/events/:eventId/certificate" element={<CertificatePage />} />
        <Route path="/chain" element={<HashChainPage />} />
        <Route path="/chain/:traceId" element={<HashChainPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default App;
