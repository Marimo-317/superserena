export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  timestamp: string;
  version: string;
}

export interface HelloResponse {
  message: string;
  name?: string;
  timestamp: string;
  version: string;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  version: string;
}