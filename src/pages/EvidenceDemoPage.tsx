import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Download, FlaskConical, Loader2, Play, XCircle } from 'lucide-react';
import { evidenceApiBaseUrl, getEvidenceDemoCases, verifyEvidenceDemoCase } from '@/lib/evidence-api';
import { cn } from '@/lib/utils';
import type { EvidenceCheck, EvidenceStatus, EvidenceVerification } from '@/types/evidence';

const statusStyles: Record<EvidenceStatus, string> = {
  VALID: 'border-verify-500/40 bg-verify-500/10 text-verify-300',
  INVALID: 'border-reject-500/40 bg-reject-500/10 text-reject-300',
  INDETERMINATE: 'border-anomaly-500/40 bg-anomaly-500/10 text-anomaly-300',
};

// Long reports do not need a backdrop-filter compositing layer. Keep their
// surface styling without the glass-card blur so mobile resize paints remain
// readable, including the verification summaries.
const evidenceCard = 'rounded-lg border border-white/10 bg-white/5';

function Verdict({ status, testId }: { status: EvidenceStatus; testId?: string }) {
  const Icon = status === 'VALID' ? CheckCircle2 : status === 'INVALID' ? XCircle : AlertCircle;
  return (
    <span data-testid={testId} className={cn('inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm font-semibold', statusStyles[status])}>
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      {status}
    </span>
  );
}

function CheckList({ checks }: { checks: EvidenceCheck[] }) {
  return (
    <ul className="space-y-3">
      {checks.map((check, index) => (
        <li key={`${check.group}-${check.name}-${index}`} data-check-name={check.name} className="rounded-lg border border-vcp-700/50 bg-vcp-950/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="break-words font-medium text-white">{check.name.replace(/_/g, ' ')}</h4>
              <p className="mt-1 text-xs text-vcp-300">{check.group} · {check.scope} check</p>
            </div>
            <Verdict status={check.status} />
          </div>
          {check.subject && <p className="mt-3 break-all font-mono text-xs text-vcp-300">{check.subject}</p>}
          {check.reason && <p className="mt-3 break-words text-sm text-white">{check.reason}</p>}
          {check.detail && <p className="mt-2 break-words text-sm text-vcp-300">{check.detail}</p>}
        </li>
      ))}
    </ul>
  );
}

function downloadText(filename: string, value: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Keep the object URL alive until the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function EvidenceReport({ report }: { report: EvidenceVerification }) {
  const localChecks = report.checks.filter(check => check.scope === 'local');
  const externalChecks = report.checks.filter(check => check.scope === 'external');
  return (
    <section aria-label="Verification result" className="space-y-6">
      <div data-testid="evidence-summary" className={cn(evidenceCard, 'scroll-mt-20 p-5 sm:p-6')}>
        <p className="text-xs font-semibold uppercase tracking-wider text-vcp-300">API verification result</p>
        <h2 className="mt-2 text-xl font-bold text-white">{report.case_title}</h2>
        <p className="mt-2 text-sm text-vcp-300">{report.description}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-vcp-700 bg-vcp-950/70 p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Full evidence</h3>
            <Verdict status={report.overall_status} testId="overall-status" />
            <p className="mt-3 text-sm text-vcp-300">
              Includes the external evidence checks. Missing anchor proof leaves the evidence unverified even when local checks match.
            </p>
          </div>
          <div className="rounded-xl border border-vcp-700 bg-vcp-950/70 p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Local checks</h3>
            <Verdict status={report.local_status} testId="local-status" />
            <p className="mt-3 text-sm text-vcp-300">
              Applies only to the local checks listed below, using the supplied evidence and configured demo trust.
            </p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-vcp-200">{report.scope}</p>
        <div className="mt-4 rounded-lg border border-vcp-700/50 bg-vcp-800/30 p-4">
          <h3 className="text-sm font-semibold text-white">
            {report.trust.key_configured ? 'Demo trust key configured' : 'No trusted key supplied'}
          </h3>
          <p className="mt-2 text-sm text-vcp-300">{report.trust.notice}</p>
        </div>
        <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-3">
          <div><dt className="text-vcp-400">SDK version</dt><dd className="mt-1 font-mono text-white">{report.sdk.version}</dd></div>
          <div><dt className="text-vcp-400">Specification version</dt><dd className="mt-1 font-mono text-white">{report.sdk.spec_version}</dd></div>
          <div><dt className="text-vcp-400">Specification commit</dt><dd className="mt-1 break-all font-mono text-white">{report.sdk.spec_commit}</dd></div>
        </dl>
      </div>

      <div className={cn(evidenceCard, 'p-5 sm:p-6')}>
        <h2 className="text-lg font-semibold text-white">Local check results</h2>
        <p className="mb-4 mt-2 text-sm text-vcp-300">
          Each outcome is returned by the API's SDK verifier. The browser does not independently repeat these cryptographic checks.
        </p>
        <CheckList checks={localChecks} />
      </div>

      <div className="rounded-lg border border-anomaly-500/30 bg-anomaly-500/5 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">External evidence and unverified checks</h2>
        <p className="mb-4 mt-2 text-sm text-vcp-200">
          These synthetic cases do not supply independently authenticated external anchor proof. INDETERMINATE is not a pass.
        </p>
        <CheckList checks={externalChecks} />
      </div>

      {report.notes.length > 0 && (
        <div className={cn(evidenceCard, 'p-5 sm:p-6')}>
          <h2 className="text-lg font-semibold text-white">Scope and limits</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-vcp-200">
            {report.notes.map((note, index) => <li key={index}>{note}</li>)}
          </ul>
        </div>
      )}

      <div className={cn(evidenceCard, 'p-5 sm:p-6')}>
        <h2 className="text-lg font-semibold text-white">Inspect the supplied evidence</h2>
        <p className="mt-2 text-sm text-vcp-300">
          Event JSONL and AnchorRecord downloads retain the exact strings returned by the API, including nanosecond integers. They are synthetic test evidence, not production records.
        </p>
        <div className="my-4 flex flex-wrap gap-3">
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => downloadText(`vcp-${report.case_id}-events.jsonl`, report.evidence.events_jsonl, 'application/x-ndjson;charset=utf-8')}>
            <Download aria-hidden="true" className="h-4 w-4" /> Download event JSONL
          </button>
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => downloadText(`vcp-${report.case_id}-anchor.json`, report.evidence.anchor_record_json, 'application/json;charset=utf-8')}>
            <Download aria-hidden="true" className="h-4 w-4" /> Download AnchorRecord
          </button>
        </div>
        <details className="rounded-lg border border-vcp-700/50 p-4">
          <summary className="cursor-pointer font-medium text-white">Event JSONL · exact source string</summary>
          <pre data-testid="evidence-events-jsonl" className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-vcp-950 p-4 font-mono text-xs text-vcp-200">{report.evidence.events_jsonl}</pre>
        </details>
        <details className="mt-3 rounded-lg border border-vcp-700/50 p-4">
          <summary className="cursor-pointer font-medium text-white">AnchorRecord · exact source string</summary>
          <pre data-testid="evidence-anchor-json" className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-vcp-950 p-4 font-mono text-xs text-vcp-200">{report.evidence.anchor_record_json}</pre>
        </details>
        <details className="mt-3 rounded-lg border border-vcp-700/50 p-4">
          <summary className="cursor-pointer font-medium text-white">Inclusion proofs · API data</summary>
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-vcp-950 p-4 font-mono text-xs text-vcp-200">{JSON.stringify(report.evidence.inclusion_proofs, null, 2)}</pre>
        </details>
      </div>
    </section>
  );
}

export function EvidenceDemoPage() {
  const [selectedId, setSelectedId] = useState('intact');
  const [request, setRequest] = useState<{ caseId: string; run: number } | null>(null);
  const runNumber = useRef(0);
  const casesQuery = useQuery({
    queryKey: ['evidenceDemoCases', evidenceApiBaseUrl],
    queryFn: ({ signal }) => getEvidenceDemoCases(signal),
    enabled: Boolean(evidenceApiBaseUrl),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  const cases = casesQuery.data?.cases ?? [];
  const activeId = cases.some(item => item.id === selectedId) ? selectedId : (cases[0]?.id ?? '');
  const verification = useQuery({
    queryKey: ['evidenceDemoVerification', evidenceApiBaseUrl, request?.caseId, request?.run],
    queryFn: ({ signal }) => verifyEvidenceDemoCase(request!.caseId, signal),
    enabled: Boolean(request && evidenceApiBaseUrl),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 0,
  });
  const report = request?.caseId === activeId && !verification.isFetching && !verification.isError
    ? verification.data : undefined;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-vcp-700/50 bg-gradient-to-br from-vcp-800/50 to-vcp-900/50 p-5 sm:p-8">
        <div className="mb-3 flex items-center gap-2 text-vcp-200">
          <FlaskConical aria-hidden="true" className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">SDK → API → Explorer</span>
        </div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Evidence Demo</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-vcp-200">
          Inspect SDK-generated synthetic evidence and request real verification from the connected API. Compare an intact case, altered evidence and a missing trust key.
        </p>
        <p className="mt-3 max-w-3xl text-sm text-vcp-300">
          A VALID local result covers only the checks performed. Full evidence verification, VCP/VAP conformance, certification and production readiness are not established by this demo.
        </p>
      </div>

      {!evidenceApiBaseUrl ? (
        <div role="status" className={cn(evidenceCard, 'p-5 sm:p-6')}>
          <h2 className="text-lg font-semibold text-white">Connect an evidence API</h2>
          <p className="mt-2 text-sm text-vcp-200">
            No evidence API is configured, so no verification has run. Configure VITE_EVIDENCE_API_BASE_URL for the local evidence demo and restart or rebuild the GUI.
          </p>
          <p className="mt-3 text-sm text-vcp-300">The legacy dashboard's mock mode is separate. This page never substitutes mock results for an unavailable API.</p>
        </div>
      ) : (
        <div className={cn(evidenceCard, 'p-5 sm:p-6')}>
          <p className="break-all text-xs text-vcp-300">Evidence API: <span className="font-mono text-white">{evidenceApiBaseUrl}</span></p>
          {casesQuery.isPending && <p role="status" className="mt-4 text-sm text-vcp-200">Loading evidence cases from the API…</p>}
          {casesQuery.isError && (
            <div role="alert" data-testid="evidence-api-error" className="mt-4 rounded-lg border border-reject-500/40 bg-reject-500/10 p-4">
              <h2 className="font-semibold text-white">Evidence API unavailable</h2>
              <p className="mt-2 text-sm text-vcp-200">{casesQuery.error.message}</p>
              <button type="button" className="btn-secondary mt-3" onClick={() => void casesQuery.refetch()}>Retry connection</button>
            </div>
          )}
          {casesQuery.data && !casesQuery.isError && (
            <form className="mt-5" onSubmit={event => {
              event.preventDefault();
              if (activeId) setRequest({ caseId: activeId, run: ++runNumber.current });
            }}>
              <fieldset>
                <legend className="text-lg font-semibold text-white">Choose an evidence case</legend>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {cases.map(item => (
                    <label key={item.id} className={cn('cursor-pointer rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-vcp-300', activeId === item.id ? 'border-vcp-400 bg-vcp-700/30' : 'border-vcp-700/50 bg-vcp-950/40 hover:border-vcp-500')}>
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="evidence-case"
                          value={item.id}
                          data-testid={`evidence-case-${item.id}`}
                          checked={activeId === item.id}
                          onChange={() => { setSelectedId(item.id); setRequest(null); }}
                          className="mt-1 accent-sky-400"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-white">{item.title}</span>
                          <span className="mt-2 block text-sm text-vcp-200">{item.description}</span>
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button type="submit" data-testid="run-verification" disabled={verification.isFetching || !activeId} className="btn-primary inline-flex items-center gap-2 disabled:cursor-wait disabled:opacity-60">
                  {verification.isFetching ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Play aria-hidden="true" className="h-4 w-4" />}
                  {verification.isFetching ? 'Verifying…' : 'Run verification'}
                </button>
                <span className="text-xs text-vcp-300">SDK {casesQuery.data.sdk_version} · VCP {casesQuery.data.spec_version} · synthetic inputs</span>
              </div>
              {casesQuery.data.disclosure.length > 0 && (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-xs leading-relaxed text-vcp-300">
                  {casesQuery.data.disclosure.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              )}
            </form>
          )}
        </div>
      )}

      {request && verification.isFetching && <p role="status" className="text-sm text-vcp-200">Verifying the selected evidence with the API's SDK…</p>}
      {request && verification.isError && (
        <div role="alert" data-testid="verification-error" className="rounded-lg border border-reject-500/40 bg-reject-500/10 p-5">
          <h2 className="font-semibold text-white">Verification did not complete</h2>
          <p className="mt-2 text-sm text-vcp-200">{verification.error.message}</p>
          <p className="mt-2 text-sm text-vcp-300">No fallback verdict is shown. Retry when the API is available.</p>
        </div>
      )}
      {report && <EvidenceReport report={report} />}
    </div>
  );
}
