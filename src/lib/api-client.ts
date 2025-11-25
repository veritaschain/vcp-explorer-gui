// VCP Explorer API Client v1.1
// Production-ready API wrapper with mock fallback

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  EventSearchParams,
  EventSearchResponse,
  EventDetailResponse,
  MerkleProofResponse,
  CertificateResponse,
  SystemStatusResponse,
  HealthCheckResponse,
  CertifiedEntitiesResponse,
  APIError,
} from '@/types/vcp';
import { getMockEvents, getMockEventDetail, getMockProof, getMockCertificate, getMockSystemStatus, getMockCertifiedEntities } from '@/mock-data/events';

// Configuration
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://explorer.veritaschain.org/api/v1',
  timeout: 10000,
  useMock: import.meta.env.VITE_USE_MOCK === 'true' || true, // Default to mock for demo
};

class VCPExplorerClient {
  private client: AxiosInstance;
  private useMock: boolean;

  constructor() {
    this.useMock = API_CONFIG.useMock;
    
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add API key if available
        const apiKey = localStorage.getItem('vcp_api_key');
        if (apiKey) {
          config.headers['X-API-Key'] = apiKey;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<APIError>) => {
        if (error.response) {
          const apiError = error.response.data;
          console.error(`[VCP API Error] ${apiError.error}: ${apiError.message}`);
        }
        return Promise.reject(error);
      }
    );
  }

  // ============================================================
  // System Endpoints
  // ============================================================

  async getSystemStatus(): Promise<SystemStatusResponse> {
    if (this.useMock) {
      return getMockSystemStatus();
    }
    const response = await this.client.get<SystemStatusResponse>('/system/status');
    return response.data;
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    if (this.useMock) {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.1.0',
        service: 'VCP Explorer API',
      };
    }
    const response = await this.client.get<HealthCheckResponse>('/health');
    return response.data;
  }

  // ============================================================
  // Event Endpoints
  // ============================================================

  async searchEvents(params: EventSearchParams = {}): Promise<EventSearchResponse> {
    if (this.useMock) {
      return getMockEvents(params);
    }
    const response = await this.client.get<EventSearchResponse>('/events', { params });
    return response.data;
  }

  async getEventById(eventId: string): Promise<EventDetailResponse> {
    if (this.useMock) {
      return getMockEventDetail(eventId);
    }
    const response = await this.client.get<EventDetailResponse>(`/events/${eventId}`);
    return response.data;
  }

  async getEventsByTraceId(traceId: string): Promise<EventSearchResponse> {
    return this.searchEvents({ trace_id: traceId });
  }

  // ============================================================
  // Verification Endpoints
  // ============================================================

  async getMerkleProof(eventId: string): Promise<MerkleProofResponse> {
    if (this.useMock) {
      return getMockProof(eventId);
    }
    const response = await this.client.get<MerkleProofResponse>(`/events/${eventId}/proof`);
    return response.data;
  }

  async getCertificate(eventId: string): Promise<CertificateResponse> {
    if (this.useMock) {
      return getMockCertificate(eventId);
    }
    const response = await this.client.get<CertificateResponse>(`/events/${eventId}/certificate`);
    return response.data;
  }

  // ============================================================
  // Certified Entities Endpoints
  // ============================================================

  async getCertifiedEntities(): Promise<CertifiedEntitiesResponse> {
    if (this.useMock) {
      return getMockCertifiedEntities();
    }
    const response = await this.client.get<CertifiedEntitiesResponse>('/certified/entities');
    return response.data;
  }

  // ============================================================
  // Configuration
  // ============================================================

  setApiKey(apiKey: string): void {
    localStorage.setItem('vcp_api_key', apiKey);
  }

  clearApiKey(): void {
    localStorage.removeItem('vcp_api_key');
  }

  setUseMock(useMock: boolean): void {
    this.useMock = useMock;
  }

  isUsingMock(): boolean {
    return this.useMock;
  }
}

// Singleton instance
export const vcpClient = new VCPExplorerClient();

// Export type for dependency injection
export type { VCPExplorerClient };
