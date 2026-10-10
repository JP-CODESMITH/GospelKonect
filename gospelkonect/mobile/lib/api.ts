import { Platform } from 'react-native';

/**
 * NestJS backend client. Base URL comes from `EXPO_PUBLIC_API_URL`;
 * otherwise Android emulator (`10.0.2.2`) vs iOS simulator (`localhost`).
 * Physical devices must set `EXPO_PUBLIC_API_URL` to the machine's LAN URL.
 */
const DEFAULT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000/api/v1' : 'http://localhost:3000/api/v1';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_URL;

export interface PublicUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body !== null && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (Array.isArray(message)) return message.map(String).join('\n');
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection.');
  }
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(body, `Request failed (${res.status}).`));
  }
  return body as T;
}

/** POST /auth/login — exchanges credentials for a token pair. */
export function loginUser(email: string, password: string): Promise<AuthSession> {
  return request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
}

/** POST /auth/register — creates the account (returns the user, no tokens). */
export function registerUser(
  username: string,
  email: string,
  password: string,
): Promise<PublicUser> {
  return request<PublicUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email: email.trim(), password }),
  });
}

/**
 * Backend register only accepts `username` (3-50 chars, display name defaults
 * to it), so derive one from the display name, falling back to the email
 * local part. A 409 still surfaces if it is taken.
 */
export function usernameFromName(name: string, email: string): string {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 30);
  const fromName = slug(name);
  if (fromName.length >= 3) return fromName;
  const fromEmail = slug(email.split('@')[0] ?? '');
  if (fromEmail.length >= 3) return fromEmail;
  return `user${Date.now().toString(36)}`;
}
