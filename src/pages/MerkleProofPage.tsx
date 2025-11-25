import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowLeft,
  Shield,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Copy,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { vcpClient } from '@/lib/api-client';
import { verifyMerkleProof, truncateHash, type VerificationResult } from '@/lib/crypto';
import { cn, copyToClipboard } from '@/lib/utils';

export function MerkleProofPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const { data: proof, isLoading, error } = useQuery({
    queryKey: ['proof', eventId],
    queryFn: () => vcpClient.getMerkleProof(eventId!),
    enabled: !!eventId,
  });

  const handleVerify = async () => {
    if (!proof) return;

    setIsVerifying(true);
    setVerificationResult(null);

    // Add small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const result = await verifyMerkleProof(
        proof.event_hash,
        proof.merkle_proof.leaf_index,
        proof.merkle_proof.audit_path,
        proof.merkle_proof.root_hash
      );
      setVerificationResult(result);
    } catch (err) {
      setVerificationResult({
        isValid: false,
        computedRoot: '',
        expectedRoot: proof.merkle_proof.root_hash,
        steps: [],
        error: err instanceof Error ? err.message : 'Verification failed',
      });
    }

    setIsVerifying(false);
  };

  const handleReset = () => {
    setVerificationResult(null);
  };

  const handleCopy = async (hash: string) => {
    await copyToClipboard(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-vcp-800/30 rounded-lg animate-pulse w-1/3" />
        <div className="glass-card p-6 space-y-4">
          <div className="h-8 bg-vcp-800/30 rounded animate-pulse w-1/2" />
          <div className="h-48 bg-vcp-800/30 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="glass-card p-8 text-center">
        <XCircle className="w-12 h-12 text-reject-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Proof Not Available</h2>
        <p className="text-vcp-400 mb-6">
          The Merkle proof for this event is not yet available. The event may not have been anchored yet.
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
              <Shield className="w-5 h-5 text-verify-400" />
              Merkle Proof Verification
            </h1>
            <p className="text-sm text-vcp-400">RFC 6962 Compliant Inclusion Proof</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {verificationResult && (
            <button onClick={handleReset} className="btn-secondary inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className={cn(
              'btn-verify inline-flex items-center gap-2',
              isVerifying && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Verify Inclusion
              </>
            )}
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={cn(
            'p-4 rounded-lg border flex items-center gap-4',
            verificationResult.isValid
              ? 'bg-verify-500/10 border-verify-500/30'
              : 'bg-reject-500/10 border-reject-500/30'
          )}
        >
          {verificationResult.isValid ? (
            <CheckCircle2 className="w-8 h-8 text-verify-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-8 h-8 text-reject-400 flex-shrink-0" />
          )}
          <div>
            <h3
              className={cn(
                'font-semibold',
                verificationResult.isValid ? 'text-verify-400' : 'text-reject-400'
              )}
            >
              {verificationResult.isValid
                ? 'Verification Successful'
                : 'Verification Failed'}
            </h3>
            <p className="text-sm text-vcp-400">
              {verificationResult.isValid
                ? 'The event is cryptographically proven to be included in the Merkle tree.'
                : verificationResult.error || 'The computed root does not match the expected root.'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proof Data */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Proof Data</h2>

          <div className="space-y-4">
            {/* Event ID */}
            <div>
              <span className="text-xs text-vcp-500 uppercase tracking-wider">Event ID</span>
              <code className="block text-sm text-vcp-300 font-mono bg-vcp-800/50 p-2 rounded mt-1">
                {proof.event_id}
              </code>
            </div>

            {/* Event Hash */}
            <div>
              <span className="text-xs text-vcp-500 uppercase tracking-wider">Event Hash (Leaf)</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-xs text-verify-400 font-mono bg-vcp-800/50 p-2 rounded truncate">
                  {proof.event_hash}
                </code>
                <button
                  onClick={() => handleCopy(proof.event_hash)}
                  className="p-2 text-vcp-400 hover:text-white hover:bg-vcp-800/50 rounded"
                >
                  {copiedHash === proof.event_hash ? (
                    <CheckCircle2 className="w-4 h-4 text-verify-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Merkle Root */}
            <div>
              <span className="text-xs text-vcp-500 uppercase tracking-wider">Merkle Root</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-xs text-purple-400 font-mono bg-vcp-800/50 p-2 rounded truncate">
                  {proof.merkle_proof.root_hash}
                </code>
                <button
                  onClick={() => handleCopy(proof.merkle_proof.root_hash)}
                  className="p-2 text-vcp-400 hover:text-white hover:bg-vcp-800/50 rounded"
                >
                  {copiedHash === proof.merkle_proof.root_hash ? (
                    <CheckCircle2 className="w-4 h-4 text-verify-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Leaf Index */}
            <div>
              <span className="text-xs text-vcp-500 uppercase tracking-wider">Leaf Index</span>
              <p className="text-white font-mono mt-1">{proof.merkle_proof.leaf_index}</p>
            </div>

            {/* Audit Path */}
            <div>
              <span className="text-xs text-vcp-500 uppercase tracking-wider mb-2 block">
                Audit Path ({proof.merkle_proof.audit_path.length} siblings)
              </span>
              <div className="space-y-2">
                {proof.merkle_proof.audit_path.map((hash, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-vcp-500 w-8">L{index}</span>
                    <code className="flex-1 text-xs text-vcp-300 font-mono bg-vcp-800/50 p-2 rounded truncate">
                      {hash}
                    </code>
                    <button
                      onClick={() => handleCopy(hash)}
                      className="p-1 text-vcp-400 hover:text-white hover:bg-vcp-800/50 rounded"
                    >
                      {copiedHash === hash ? (
                        <CheckCircle2 className="w-3 h-3 text-verify-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Merkle Tree Visualization */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tree Visualization</h2>

          <div className="flex flex-col items-center py-8">
            {/* Root */}
            <div className="merkle-node root px-4 py-3 text-center">
              <span className="text-xs text-vcp-500 block mb-1">Root</span>
              <span className="text-xs font-mono text-purple-400">
                {truncateHash(proof.merkle_proof.root_hash, 8)}
              </span>
            </div>

            {/* Tree lines */}
            <div className="w-px h-8 bg-vcp-600" />

            {/* Intermediate levels */}
            {proof.merkle_proof.audit_path
              .slice()
              .reverse()
              .map((hash, i) => (
                <div key={i}>
                  <div className="flex items-center gap-4">
                    <div className="merkle-node px-3 py-2 text-center opacity-60">
                      <span className="text-xs font-mono text-vcp-400">
                        {truncateHash(hash, 6)}
                      </span>
                    </div>
                    <div className="w-8 h-px bg-vcp-600" />
                    <div className="merkle-node px-3 py-2 text-center">
                      <span className="text-xs font-mono text-vcp-300">computed</span>
                    </div>
                  </div>
                  <div className="w-px h-6 bg-vcp-600 mx-auto" />
                </div>
              ))}

            {/* Leaf node */}
            <div className="merkle-node leaf px-4 py-3 text-center">
              <span className="text-xs text-verify-500 block mb-1">Leaf #{proof.merkle_proof.leaf_index}</span>
              <span className="text-xs font-mono text-verify-400">
                {truncateHash(proof.event_hash, 8)}
              </span>
            </div>
          </div>

          {/* Verification Steps */}
          {verificationResult && verificationResult.steps.length > 0 && (
            <div className="mt-6 pt-6 border-t border-vcp-800">
              <h3 className="text-sm font-semibold text-white mb-3">Verification Steps</h3>
              <div className="space-y-2">
                {verificationResult.steps.map((step) => (
                  <div
                    key={step.step}
                    className={cn(
                      'flex items-start gap-3 p-2 rounded',
                      step.success ? 'bg-verify-500/5' : 'bg-reject-500/5'
                    )}
                  >
                    {step.success ? (
                      <CheckCircle2 className="w-4 h-4 text-verify-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-reject-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-white">{step.operation}</p>
                      <p className="text-xs text-vcp-500 mt-0.5">
                        {step.input} <ChevronRight className="w-3 h-3 inline" /> {step.output}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Algorithm Explanation */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">How Merkle Proof Verification Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="w-10 h-10 bg-vcp-600/20 rounded-lg flex items-center justify-center mb-3">
              <span className="text-lg font-bold text-vcp-400">1</span>
            </div>
            <h3 className="font-medium text-white mb-2">Compute Leaf Hash</h3>
            <p className="text-sm text-vcp-400">
              Hash the event data with a 0x00 prefix: <code className="text-xs">SHA256(0x00 || event_hash)</code>
            </p>
          </div>
          <div>
            <div className="w-10 h-10 bg-vcp-600/20 rounded-lg flex items-center justify-center mb-3">
              <span className="text-lg font-bold text-vcp-400">2</span>
            </div>
            <h3 className="font-medium text-white mb-2">Walk Up the Tree</h3>
            <p className="text-sm text-vcp-400">
              For each sibling in the audit path, combine hashes: <code className="text-xs">SHA256(0x01 || left || right)</code>
            </p>
          </div>
          <div>
            <div className="w-10 h-10 bg-vcp-600/20 rounded-lg flex items-center justify-center mb-3">
              <span className="text-lg font-bold text-vcp-400">3</span>
            </div>
            <h3 className="font-medium text-white mb-2">Compare Root</h3>
            <p className="text-sm text-vcp-400">
              If the computed root matches the expected root, the event is proven to be in the tree.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
