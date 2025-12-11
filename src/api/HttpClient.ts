import { API_BASE_URL } from '../config';
import { AuthManager } from './AuthManager';

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

interface ApiError extends Error {
    code?: number;
}

export class HttpClient {
    private static getUrl(endpoint: string, params?: Record<string, string>): string {
        const url = new URL(API_BASE_URL + endpoint);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }
        return url.toString();
    }

    private static async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { params, ...fetchOptions } = options;
        const url = this.getUrl(endpoint, params);
        const authManager = AuthManager.getInstance();

        const headers = new Headers(options.headers || {});
        headers.set('Content-Type', 'application/json');

        const token = authManager.getToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        const response = await fetch(url, {
            ...fetchOptions,
            headers
        });

        if (!response.ok) {
            const error = new Error() as ApiError;
            error.message = await response.text();
            error.code = response.status;
            throw error;
        }

        return response.json();
    }

    static async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        return this.request(endpoint, {
            ...options,
            method: 'GET'
        });
    }

    static async post<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined
        });
    }

    static async patch<T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> {
        return this.request(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    }

    static async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        return this.request(endpoint, {
            ...options,
            method: 'DELETE'
        });
    }
}
