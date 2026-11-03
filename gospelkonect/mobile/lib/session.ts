import * as SecureStore from 'expo-secure-store';
import type { PublicUser } from './types';

const ACCESS_KEY = 'gk.accessToken';
const REFRESH_KEY = 'gk.refreshToken';
const USER_KEY = 'gk.user';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: PublicUser | null;
}

/**
 * In-memory cache of the persisted session. SecureStore is async, so keeping
 * the last value avoids two native reads on every API call. save/clear keep it
 * in sync with disk.
 */
let cached: StoredSession | null | undefined;

function parseUser(raw: string | null): PublicUser | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

export async function saveSession(
  accessToken: string,
  refreshToken: string,
  user?: PublicUser | null,
): Promise<StoredSession> {
  const next: StoredSession = {
    accessToken,
    refreshToken,
    user: user ?? cached?.user ?? null,
  };
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, next.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, next.refreshToken),
    next.user
      ? SecureStore.setItemAsync(USER_KEY, JSON.stringify(next.user))
      : SecureStore.deleteItemAsync(USER_KEY),
  ]);
  cached = next;
  return next;
}

export async function saveUser(user: PublicUser): Promise<void> {
  const current = await loadSession();
  if (!current) return;
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  cached = { ...current, user };
}

export async function loadSession(): Promise<StoredSession | null> {
  if (cached !== undefined) return cached;

  const [accessToken, refreshToken, user] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);
  if (accessToken && refreshToken) {
    cached = { accessToken, refreshToken, user: parseUser(user) };
    return cached;
  }

  cached = null;
  return null;
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
  cached = null;
}
