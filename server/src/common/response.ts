import { v4 as uuidv4 } from 'uuid';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  requestId: string;
}

export function ok<T>(data: T, message = 'ok'): ApiResponse<T> {
  return { code: 0, message, data, requestId: uuidv4() };
}

export function fail(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null, requestId: uuidv4() };
}
