import { parseEvidenceCases, parseEvidenceVerification } from './evidence-response';

// Evidence reports always come from an explicitly configured API. They never
// use the legacy dashboard's mock data or silently fall back to another source.
export const evidenceApiBaseUrl = (
  import.meta.env.VITE_EVIDENCE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/+$/, '');

async function getEvidenceJson(path: string, signal?: AbortSignal): Promise<unknown> {
  if (!evidenceApiBaseUrl) throw new Error('The evidence API is not configured.');
  let response: Response;
  try {
    response = await fetch(`${evidenceApiBaseUrl}${path}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Could not connect to the evidence API. No verification result is available.');
  }
  if (!response.ok) {
    throw new Error(`The evidence API returned HTTP ${response.status}. No verification result is available.`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error('The evidence API did not return a JSON report. No verification result is available.');
  }
}

export async function getEvidenceDemoCases(signal?: AbortSignal) {
  return parseEvidenceCases(await getEvidenceJson('/evidence-demo/cases', signal));
}

export async function verifyEvidenceDemoCase(caseId: string, signal?: AbortSignal) {
  const data = await getEvidenceJson(`/evidence-demo/cases/${encodeURIComponent(caseId)}/verification`, signal);
  return parseEvidenceVerification(data, caseId);
}
