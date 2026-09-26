/**
 * NEXUS EDGE API Service Client
 * Phase 1: Product Foundation
 * 
 * Configurable via VITE_API_BASE_URL.
 * Gracefully handles connectivity and network errors with clear human messages.
 */

import type { HealthResponse, SystemMetrics, ContextInfo } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Service returned HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Connection timed out. Local NEXUS service may be unresponsive.');
        }
        throw new Error(err.message || 'Unable to connect to local NEXUS edge service.');
      }
      throw new Error('An unexpected error occurred while communicating with the edge service.');
    }
  }

  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  public async getSystemDiagnostics(): Promise<SystemMetrics> {
    return this.request<SystemMetrics>('/system');
  }

  public async getContext(): Promise<ContextInfo> {
    return this.request<ContextInfo>('/context');
  }

  public async sendAssistantQuery(message: string, contextType: string = 'general'): Promise<{
    response: string;
    status: string;
    phase: string;
    execution_mode: string;
    timestamp: string;
  }> {
    return this.request('/assistant/query', {
      method: 'POST',
      body: JSON.stringify({ message, context_type: contextType }),
    });
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const api = new ApiService(API_BASE_URL);
