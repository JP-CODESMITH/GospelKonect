import { Platform } from 'react-native';
import { clearSession, loadSession, saveSession } from './session';
import type {
  AuthSession,
  Comment,
  DiscoverUser,
  FeedPage,
  MediaDto,
  Notification,
  Paginated,
  Post,
  PublicUser,
  ReactionState,
  ReactionType,
  UserProfile,
} from './types';

/**
 * NestJS backend client. Base URL comes from `EXPO_PUBLIC_API_URL`;
 * otherwise Android emulator (`10.0.2.2`) vs iOS simulator (`localhost`).
 * Physical devices must set `EXPO_PUBLIC_API_URL` to the machine's LAN URL,
 * including the `/api/v1` prefix (e.g. `http://192.168.1.20:3000/api/v1`).
 */
const DEFAULT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000/api/v1' : 'http://localhost:3000/api/v1';

const RAW_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_URL).replace(/\/+$/, '');

export const API_URL = RAW_URL;
export const API_ORIGIN = RAW_URL.replace(/\/api\/v1$/, '');

/** Turns a `/api/v1/media/...` path from the API into a device-loadable URL. */
export function mediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

export type { AuthSession, PublicUser };

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type AuthMode = 'none' | 'optional' | 'required';

interface RequestOptions {
  auth?: AuthMode;
  retried?: boolean;
}

function errorMessage(body: unknown, fallback: string): string {
  if (body !== null && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (Array.isArray(message)) return message.map(String).join('\n');
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Rotates the stored refresh token. Returns true when a fresh pair was saved.
 * Concurrent 401s share one refresh call because the backend revokes the old
 * token on use — two parallel rotations would log the second request out.
 */
async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const stored = await loadSession();
    if (!stored) return false;

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      });
      if (!res.ok) {
        await clearSession();
        return false;
      }
      const body = (await res.json()) as AuthSession;
      await saveSession(body.accessToken, body.refreshToken, body.user);
      return true;
    } catch {
      // Network failure: keep the tokens so a later request can try again.
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  { auth = 'none', retried = false }: RequestOptions = {},
): Promise<T> {
  const stored = auth === 'none' ? null : await loadSession();
  if (auth === 'required' && !stored) {
    throw new ApiError(401, 'You need to sign in to do that.');
  }

  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (stored?.accessToken) {
    headers.set('Authorization', `Bearer ${stored.accessToken}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection.');
  }

  if (res.status === 401 && auth !== 'none' && stored && !retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, init, { auth, retried: true });
    }
  }

  if (res.status === 204) return undefined as T;

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(body, `Request failed (${res.status}).`));
  }
  return body as T;
}

// --- auth ------------------------------------------------------------------

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
  name?: string,
): Promise<PublicUser> {
  return request<PublicUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email: email.trim(),
      password,
      ...(name ? { name } : {}),
    }),
  });
}

/** GET /auth/me — the caller's own account. Refreshes the token if needed. */
export function getMe(): Promise<PublicUser> {
  return request<PublicUser>('/auth/me', {}, { auth: 'required' });
}

/** POST /auth/logout — revokes this session. Local tokens are always cleared. */
export async function logoutUser(): Promise<void> {
  const stored = await loadSession();
  try {
    await request<void>(
      '/auth/logout',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken: stored?.refreshToken }),
      },
      { auth: 'required' },
    );
  } catch {
    // A dead/expired session is already logged out as far as this device cares.
  } finally {
    await clearSession();
  }
}

/** POST /auth/logout-all — ends every session for the account. */
export async function logoutAllDevices(): Promise<void> {
  try {
    await request<void>('/auth/logout-all', { method: 'POST' }, { auth: 'required' });
  } catch {
    // Same reasoning as logoutUser: clear locally regardless.
  } finally {
    await clearSession();
  }
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
      .replace(/[^a-z0-9_]+/g, '')
      .slice(0, 30);
  const fromName = slug(name);
  if (fromName.length >= 3) return fromName;
  const fromEmail = slug(email.split('@')[0] ?? '');
  if (fromEmail.length >= 3) return fromEmail;
  return `user${Date.now().toString(36)}`;
}

// --- feed & posts ----------------------------------------------------------

/** GET /feed — the personalised home timeline. Cursor wins over page. */
export function getFeed(params?: {
  cursor?: string;
  page?: number;
  limit?: number;
}): Promise<FeedPage> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set('cursor', params.cursor);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const suffix = query.toString();
  return request<FeedPage>(`/feed${suffix ? `?${suffix}` : ''}`, {}, { auth: 'required' });
}

/** GET /posts — the public global feed. */
export function listPosts(params?: { page?: number; limit?: number }): Promise<Paginated<Post>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const suffix = query.toString();
  return request<Paginated<Post>>(`/posts${suffix ? `?${suffix}` : ''}`, {}, { auth: 'optional' });
}

/** POST /posts — publish a post as the signed-in user. */
export function createPost(content: string, mediaIds?: string[]): Promise<Post> {
  return request<Post>(
    '/posts',
    {
      method: 'POST',
      body: JSON.stringify({ content, ...(mediaIds?.length ? { mediaIds } : {}) }),
    },
    { auth: 'required' },
  );
}

/** DELETE /posts/:id — only your own post. */
export function deletePost(id: string): Promise<void> {
  return request<void>(`/posts/${id}`, { method: 'DELETE' }, { auth: 'required' });
}

/** PUT /posts/:id/reactions — set/replace the caller's reaction. */
export function setReaction(postId: string, type: ReactionType): Promise<ReactionState> {
  return request<ReactionState>(
    `/posts/${postId}/reactions`,
    { method: 'PUT', body: JSON.stringify({ type }) },
    { auth: 'required' },
  );
}

/** DELETE /posts/:id/reactions — remove the caller's reaction. */
export function removeReaction(postId: string): Promise<ReactionState> {
  return request<ReactionState>(
    `/posts/${postId}/reactions`,
    { method: 'DELETE' },
    { auth: 'required' },
  );
}

/** GET /posts/:postId/comments — oldest first. */
export function listComments(
  postId: string,
  params?: { page?: number; limit?: number },
): Promise<Paginated<Comment>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const suffix = query.toString();
  return request<Paginated<Comment>>(
    `/posts/${postId}/comments${suffix ? `?${suffix}` : ''}`,
  );
}

/** POST /posts/:postId/comments — add a comment or reply. */
export function createComment(
  postId: string,
  content: string,
  parentId?: string,
): Promise<Comment> {
  return request<Comment>(
    `/posts/${postId}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ content, ...(parentId ? { parentId } : {}) }),
    },
    { auth: 'required' },
  );
}

// --- users -----------------------------------------------------------------

/** GET /users/:username — public profile plus graph counts. */
export function getProfile(username: string): Promise<UserProfile> {
  return request<UserProfile>(`/users/${encodeURIComponent(username)}`, {}, { auth: 'optional' });
}

/** GET /users — discovery, optionally filtered by free text. */
export function searchUsers(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<DiscoverUser>> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const suffix = query.toString();
  return request<Paginated<DiscoverUser>>(`/users${suffix ? `?${suffix}` : ''}`, {}, {
    auth: 'optional',
  });
}

/** GET /users/:username/posts — one handle's timeline. */
export function getUserPosts(
  username: string,
  params?: { page?: number; limit?: number },
): Promise<Paginated<Post>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const suffix = query.toString();
  return request<Paginated<Post>>(
    `/users/${encodeURIComponent(username)}/posts${suffix ? `?${suffix}` : ''}`,
    {},
    { auth: 'optional' },
  );
}

/** PATCH /users/me — update the caller's display name / handle / bio. */
export function updateProfile(input: {
  name?: string;
  username?: string;
  bio?: string;
}): Promise<PublicUser> {
  return request<PublicUser>(
    '/users/me',
    { method: 'PATCH', body: JSON.stringify(input) },
    { auth: 'required' },
  );
}

/** POST /users/:id/follow — idempotent. */
export function followUser(id: string): Promise<void> {
  return request<void>(`/users/${id}/follow`, { method: 'POST' }, { auth: 'required' });
}

/** DELETE /users/:id/follow — idempotent. */
export function unfollowUser(id: string): Promise<void> {
  return request<void>(`/users/${id}/follow`, { method: 'DELETE' }, { auth: 'required' });
}

// --- notifications ---------------------------------------------------------

/** GET /notifications — the inbox, newest first. */
export function listNotifications(params?: {
  unread?: boolean;
  page?: number;
  limit?: number;
}): Promise<Paginated<Notification>> {
  const query = new URLSearchParams();
  if (params?.unread !== undefined) query.set('unread', params.unread ? 'true' : 'false');
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const suffix = query.toString();
  return request<Paginated<Notification>>(`/notifications${suffix ? `?${suffix}` : ''}`, {}, {
    auth: 'required',
  });
}

/** GET /notifications/unread-count — the badge number. */
export function getUnreadCount(): Promise<{ count: number }> {
  return request<{ count: number }>('/notifications/unread-count', {}, { auth: 'required' });
}

/** POST /notifications/read — mark specific ids, or everything when omitted. */
export function markNotificationsRead(ids?: string[]): Promise<{ updated: number }> {
  return request<{ updated: number }>(
    '/notifications/read',
    { method: 'POST', body: JSON.stringify(ids?.length ? { ids } : {}) },
    { auth: 'required' },
  );
}

export type { MediaDto };
