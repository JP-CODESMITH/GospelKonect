import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'gk.accessToken';
const REFRESH_KEY = 'gk.refreshToken';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

export async function saveSession(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function loadSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  if (accessToken && refreshToken) return { accessToken, refreshToken };
  return null;
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
