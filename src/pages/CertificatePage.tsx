import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Download,
  Shield,
  CheckCircle2,
  ExternalLink,
  Copy,
  Printer,
} from 'lucide-react';
import { vcpClient } from '@/lib/api-client';
import { formatDatePrecise, formatNumber, copyToClipboard } from '@/lib/utils';
import { truncateHash } from '@/lib/crypto';
import { EventTypeBadge } from '@/components/features/EventTypeBadge';
import { useState } from 'react';
import type { EventType } from '@/types/vcp';

export function CertificatePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: certificate, isLoading, error } = useQuery({
    queryKey: ['certificate', eventId],
    queryFn: () => vcpClient.getCertificate(eventId!),
    enabled: !!eventId,
  });

  const handleCopy = async (value: string, field: string) => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-vcp-800/30 rounded-lg animate-pulse w-1/3" />
        <div className="glass-card p-6 space-y-4">
          <div className="h-8 bg-vcp-800/30 rounded animate-pulse w-1/2" />
          <div className="h-64 bg-vcp-800/30 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="glass-card p-8 text-center">
        <FileText className="w-12 h-12 text-reject-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Certificate Not Available</h2>
        <p className="text-vcp-400 mb-6">
          The certificate for this event could not be generated.
        </p>
        <Link to={`/events/${eventId}`} className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Event
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/events/${eventId}`}
            className="p-2 text-vcp-400 hover:text-white hover:bg-vcp-800/50 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-vcp-400" />
              Event Certificate
            </h1>
            <p className="text-sm text-vcp-400">Regulatory Compliance Export</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="btn-secondary inline-flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button className="btn-primary inline-flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Certificate Document */}
      <div className="glass-card p-8 print:p-4 print:shadow-none print:border-gray-300">
        {/* Certificate Header */}
        <div className="text-center border-b border-vcp-800 pb-6 mb-6 print:border-gray-300">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-vcp-600 to-verify-600 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white print:text-black mb-2">
            VCP Event Certificate
          </h2>
          <p className="text-vcp-400 print:text-gray-600">
            VeritasChain Protocol v{certificate.system.vcp_version} • {certificate.system.tier} Tier
          </p>
        </div>

        {/* Verification Status */}
        <div className="flex items-center justify-center gap-3 mb-8 p-4 bg-verify-500/10 border border-verify-500/20 rounded-lg print:bg-green-50 print:border-green-200">
          <CheckCircle2 className="w-6 h-6 text-verify-400 print:text-green-600" />
          <span className="font-semibold text-verify-400 print:text-green-700">
            Cryptographically Verified & Blockchain Anchored
          </span>
        </div>

        {/* Event Summary */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-vcp-500 print:text-gray-500 uppercase tracking-wider mb-3">
              Event Information
            </h3>
            <div className="space-y-3">
              <CertField
                label="Event ID"
                value={certificate.event_id}
                mono
                copyable
                onCopy={() => handleCopy(certificate.event_id, 'event_id')}
                copied={copiedField === 'event_id'}
              />
              <CertField
                label="Trace ID"
                value={certificate.header.trace_id}
                mono
              />
              <CertField
                label="Event Type"
                value={
                  <EventTypeBadge type={certificate.header.event_type as EventType} size="sm" />
                }
              />
              <CertField
                label="Symbol"
                value={certificate.header.symbol}
              />
              <CertField
                label="Venue"
                value={certificate.header.venue_id}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-vcp-500 print:text-gray-500 uppercase tracking-wider mb-3">
              Timestamp & Precision
            </h3>
            <div className="space-y-3">
              <CertField
                label="Timestamp"
                value={formatDatePrecise(certificate.header.timestamp_iso)}
              />
              <CertField
                label="Precision"
                value={certificate.header.timestamp_precision}
              />
              <CertField
                label="Clock Sync"
                value={certificate.header.clock_sync_status}
              />
              <CertField
                label="Hash Algorithm"
                value={certificate.header.hash_algo}
              />
            </div>
          </div>
        </div>

        {/* Cryptographic Proof */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-vcp-500 print:text-gray-500 uppercase tracking-wider mb-3">
            Cryptographic Proof
          </h3>
          <div className="space-y-4 bg-vcp-900/50 print:bg-gray-100 rounded-lg p-4">
            <div>
              <span className="text-xs text-vcp-500 print:text-gray-500">Event Hash (SHA-256)</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-xs text-verify-400 print:text-green-700 font-mono break-all">
                  {certificate.security.event_hash}
                </code>
                <button
                  onClick={() => handleCopy(certificate.security.event_hash, 'event_hash')}
                  className="p-1 text-vcp-400 hover:text-white print:hidden"
                >
                  {copiedField === 'event_hash' ? (
                    <CheckCircle2 className="w-3 h-3 text-verify-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <span className="text-xs text-vcp-500 print:text-gray-500">Merkle Root</span>
              <code className="block text-xs text-purple-400 print:text-purple-700 font-mono mt-1 break-all">
                {certificate.security.merkle_root}
              </code>
            </div>

            <div>
              <span className="text-xs text-vcp-500 print:text-gray-500">
                Digital Signature ({certificate.security.sign_algo})
              </span>
              <code className="block text-xs text-vcp-300 print:text-gray-600 font-mono mt-1 break-all">
                {certificate.security.signature}
              </code>
            </div>
          </div>
        </div>

        {/* Merkle Proof */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-vcp-500 print:text-gray-500 uppercase tracking-wider mb-3">
            Merkle Inclusion Proof (RFC 6962)
          </h3>
          <div className="bg-vcp-900/50 print:bg-gray-100 rounded-lg p-4">
            <div className="flex items-center gap-4 mb-3">
              <div>
                <span className="text-xs text-vcp-500 print:text-gray-500">Leaf Index</span>
                <p className="font-mono text-white print:text-black">
                  #{certificate.merkle_proof.leaf_index}
                </p>
              </div>
              <div>
                <span className="text-xs text-vcp-500 print:text-gray-500">Audit Path Length</span>
                <p className="font-mono text-white print:text-black">
                  {certificate.merkle_proof.audit_path.length} siblings
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {certificate.merkle_proof.audit_path.map((hash, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-vcp-500 print:text-gray-500 w-6">L{i}</span>
                  <code className="text-xs text-vcp-300 print:text-gray-600 font-mono truncate">
                    {hash}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Blockchain Anchor */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-vcp-500 print:text-gray-500 uppercase tracking-wider mb-3">
            Blockchain Anchor
          </h3>
          <div className="bg-verify-500/10 print:bg-green-50 border border-verify-500/20 print:border-green-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <CertField label="Network" value={certificate.anchor_info.network} />
              <CertField
                label="Block Number"
                value={`#${formatNumber(certificate.anchor_info.block_number)}`}
              />
              <div className="col-span-2">
                <span className="text-xs text-vcp-500 print:text-gray-500">Transaction Hash</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs text-vcp-300 print:text-gray-600 font-mono truncate">
                    {certificate.anchor_info.tx_hash}
                  </code>
                  <a
                    href={`https://etherscan.io/tx/${certificate.anchor_info.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-vcp-400 hover:text-white print:hidden"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <CertField
                label="Anchored At"
                value={formatDatePrecise(certificate.anchor_info.anchored_at)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-vcp-800 print:border-gray-300">
          <p className="text-xs text-vcp-500 print:text-gray-500 mb-2">
            Certificate generated at {formatDatePrecise(certificate.generated_at)}
          </p>
          <p className="text-xs text-vcp-500 print:text-gray-500">
            VeritasChain Standards Organization (VSO) • veritaschain.org
          </p>
          <p className="text-xs text-vcp-400 print:text-gray-400 mt-2">
            This certificate can be independently verified using the VCP Explorer or any RFC 6962 compliant verifier.
          </p>
        </div>
      </div>

      {/* Use Cases */}
      <div className="glass-card p-6 print:hidden">
        <h3 className="text-lg font-semibold text-white mb-4">Certificate Use Cases</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <UseCaseCard
            title="Regulatory Submission"
            description="Submit to SEC, FINRA, or ESMA as proof of execution"
          />
          <UseCaseCard
            title="Dispute Resolution"
            description="Cryptographic evidence for trade disputes"
          />
          <UseCaseCard
            title="Audit Trail"
            description="Complete documentation for internal/external audits"
          />
          <UseCaseCard
            title="Trader Verification"
            description="Proof of legitimate trade execution for prop firms"
          />
        </div>
      </div>
    </div>
  );
}

// Certificate Field Component
interface CertFieldProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}

function CertField({ label, value, mono, copyable, onCopy, copied }: CertFieldProps) {
  return (
    <div>
      <span className="text-xs text-vcp-500 print:text-gray-500">{label}</span>
      <div className="flex items-center gap-2 mt-0.5">
        {typeof value === 'string' ? (
          <p className={`text-sm text-white print:text-black ${mono ? 'font-mono' : ''}`}>
            {mono ? truncateHash(value, 16) : value}
          </p>
        ) : (
          value
        )}
        {copyable && onCopy && (
          <button
            onClick={onCopy}
            className="p-1 text-vcp-400 hover:text-white print:hidden"
          >
            {copied ? (
              <CheckCircle2 className="w-3 h-3 text-verify-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Use Case Card Component
function UseCaseCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 bg-vcp-800/30 rounded-lg">
      <h4 className="font-medium text-white mb-1">{title}</h4>
      <p className="text-sm text-vcp-400">{description}</p>
    </div>
  );
}
