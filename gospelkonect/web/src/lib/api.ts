/**
 * Browser client for the GospelKonect NestJS API.
 *
 * The backend mounts everything under `/api/v1` (see src/main.ts). The base URL
 * comes from `VITE_API_URL` at build/dev time; otherwise it falls back to the
 * local backend. To point at a deployed API, create `web/.env.local` with:
 *
 *   VITE_API_URL=https://api.example.com/api/v1
 *
 * Tokens live in localStorage because the web app is a public browser client
 * (the mobile app uses SecureStore). Access tokens are short-lived; a 401 on a
 * guarded call rotates the refresh token once and retries the request.
 */

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
} from './types'

export type {
  AuthSession,
  Comment,
  DiscoverUser,
  FeedPage,
  FeedMeta,
  MediaDto,
  Notification,
  NotificationType,
  PageMeta,
  Paginated,
  Post,
  PostAuthor,
  PublicUser,
  ReactionState,
  ReactionTally,
  ReactionType,
  UserProfile,
} from './types'

const RAW_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/+$/, '')

export const API_URL = RAW_URL
export const API_ORIGIN = RAW_URL.replace(/\/api\/v1$/, '')

/** Turns a `/api/v1/media/...` path from the API into a loadable URL. */
export function mediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type AuthMode = 'none' | 'optional' | 'required'

const ACCESS_KEY = 'gk.accessToken'
const REFRESH_KEY = 'gk.refreshToken'
const USER_KEY = 'gk.user'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function readTokens(): { accessToken: string; refreshToken: string } | null {
  if (!isBrowser()) return null
  const accessToken = window.localStorage.getItem(ACCESS_KEY)
  const refreshToken = window.localStorage.getItem(REFRESH_KEY)
  if (!accessToken || !refreshToken) return null
  return { accessToken, refreshToken }
}

function persistSession(session: AuthSession): void {
  if (!isBrowser()) return
  window.localStorage.setItem(ACCESS_KEY, session.accessToken)
  window.localStorage.setItem(REFRESH_KEY, session.refreshToken)
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user))
}

/** True when this device has a stored token pair. */
export function hasStoredSession(): boolean {
  return readTokens() !== null
}

/** The cached profile, shown before `/auth/me` revalidates it. */
export function loadStoredUser(): PublicUser | null {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PublicUser
  } catch {
    return null
  }
}

export function updateStoredUser(user: PublicUser): void {
  if (!isBrowser()) return
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredSession(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(ACCESS_KEY)
  window.localStorage.removeItem(REFRESH_KEY)
  window.localStorage.removeItem(USER_KEY)
}

function errorMessage(body: unknown, fallback: string): string {
  if (body !== null && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message
    if (Array.isArray(message)) return message.map(String).join('\n')
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

let refreshInFlight: Promise<boolean> | null = null

/**
 * Rotates the stored refresh token. Returns true when a fresh pair was saved.
 * Concurrent 401s share one refresh call because the backend revokes the old
 * token on use — two parallel rotations would log the second request out.
 */
async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const stored = readTokens()
    if (!stored) return false

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      })
      if (!res.ok) {
        clearStoredSession()
        return false
      }
      const body = (await res.json()) as AuthSession
      persistSession(body)
      return true
    } catch {
      // Network failure: keep the tokens so a later request can try again.
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  auth: AuthMode = 'none',
  retried = false,
): Promise<T> {
  const stored = auth === 'none' ? null : readTokens()
  if (auth === 'required' && !stored) {
    throw new ApiError(401, 'You need to sign in to do that.')
  }

  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (stored?.accessToken) {
    headers.set('Authorization', `Bearer ${stored.accessToken}`)
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection.')
  }

  if (res.status === 401 && auth !== 'none' && stored && !retried) {
    if (await refreshAccessToken()) {
      return request<T>(path, init, auth, true)
    }
  }

  if (res.status === 204) return undefined as T

  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(body, `Request failed (${res.status}).`))
  }
  return body as T
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
}

// --- auth ------------------------------------------------------------------

/** POST /auth/login — exchanges credentials for a token pair and stores it. */
export async function loginUser(email: string, password: string): Promise<AuthSession> {
  const session = await request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  })
  persistSession(session)
  return session
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
  })
}

/** GET /auth/me — the caller's own account. Refreshes the token if needed. */
export function getMe(): Promise<PublicUser> {
  return request<PublicUser>('/auth/me', {}, 'required')
}

/** PATCH /users/me — update the caller's display name / handle / bio. */
export function updateProfile(input: {
  name?: string
  username?: string
  bio?: string
}): Promise<PublicUser> {
  return request<PublicUser>(
    '/users/me',
    { method: 'PATCH', body: JSON.stringify(input) },
    'required',
  )
}

/** POST /auth/logout — revokes this session. Local tokens are always cleared. */
export async function logoutUser(): Promise<void> {
  const stored = readTokens()
  if (!stored) return

  try {
    let res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stored.accessToken}`,
      },
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
    })
    // The access token expired between the last request and sign-out. Rotate
    // once and revoke the NEW refresh token, otherwise that session survives.
    if (res.status === 401 && (await refreshAccessToken())) {
      const next = readTokens()
      if (next) {
        res = await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${next.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: next.refreshToken }),
        })
      }
    }
  } catch {
    // Offline sign-out still clears the device.
  } finally {
    clearStoredSession()
  }
}

/** POST /auth/logout-all — ends every session for the account. */
export async function logoutAllDevices(): Promise<void> {
  try {
    await request<void>('/auth/logout-all', { method: 'POST' }, 'required')
  } catch {
    // Same reasoning as logoutUser: clear locally regardless.
  } finally {
    clearStoredSession()
  }
}

/**
 * The register endpoint only accepts `username` (3-50 chars; display name
 * defaults to it), so derive one from the display name, falling back to the
 * email local part. A 409 still surfaces if it is taken.
 */
export function usernameFromName(name: string, email: string): string {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '')
      .slice(0, 30)
  const fromName = slug(name)
  if (fromName.length >= 3) return fromName
  const fromEmail = slug(email.split('@')[0] ?? '')
  if (fromEmail.length >= 3) return fromEmail
  return `user${Date.now().toString(36)}`
}

// --- feed & posts ----------------------------------------------------------

/** GET /feed — the personalised home timeline. Cursor wins over page. */
export function getFeed(params?: {
  cursor?: string
  page?: number
  limit?: number
}): Promise<FeedPage> {
  return request<FeedPage>(
    `/feed${query({ cursor: params?.cursor, page: params?.page, limit: params?.limit })}`,
    {},
    'required',
  )
}

/** GET /posts — the public global feed. */
export function listPosts(params?: { page?: number; limit?: number }): Promise<Paginated<Post>> {
  return request<Paginated<Post>>(
    `/posts${query({ page: params?.page, limit: params?.limit })}`,
    {},
    'optional',
  )
}

/** GET /posts/:id — a single post. */
export function getPost(id: string): Promise<Post> {
  return request<Post>(`/posts/${id}`, {}, 'optional')
}

/** POST /posts — publish a post as the signed-in user. */
export function createPost(content: string, mediaIds?: string[]): Promise<Post> {
  return request<Post>(
    '/posts',
    {
      method: 'POST',
      body: JSON.stringify({ content, ...(mediaIds?.length ? { mediaIds } : {}) }),
    },
    'required',
  )
}

/** PATCH /posts/:id — edit your own post. */
export function updatePost(id: string, content: string): Promise<Post> {
  return request<Post>(
    `/posts/${id}`,
    { method: 'PATCH', body: JSON.stringify({ content }) },
    'required',
  )
}

/** DELETE /posts/:id — only your own post. */
export function deletePost(id: string): Promise<void> {
  return request<void>(`/posts/${id}`, { method: 'DELETE' }, 'required')
}

/** PUT /posts/:id/reactions — set/replace the caller's reaction. */
export function setReaction(postId: string, type: ReactionType): Promise<ReactionState> {
  return request<ReactionState>(
    `/posts/${postId}/reactions`,
    { method: 'PUT', body: JSON.stringify({ type }) },
    'required',
  )
}

/** DELETE /posts/:id/reactions — remove the caller's reaction. */
export function removeReaction(postId: string): Promise<ReactionState> {
  return request<ReactionState>(
    `/posts/${postId}/reactions`,
    { method: 'DELETE' },
    'required',
  )
}

// --- comments --------------------------------------------------------------

/** GET /posts/:postId/comments — oldest first. */
export function listComments(
  postId: string,
  params?: { page?: number; limit?: number },
): Promise<Paginated<Comment>> {
  return request<Paginated<Comment>>(
    `/posts/${postId}/comments${query({ page: params?.page, limit: params?.limit })}`,
  )
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
    'required',
  )
}

/** PATCH /comments/:id — edit your own comment. */
export function updateComment(id: string, content: string): Promise<Comment> {
  return request<Comment>(
    `/comments/${id}`,
    { method: 'PATCH', body: JSON.stringify({ content }) },
    'required',
  )
}

/** DELETE /comments/:id — delete your own comment (and its replies). */
export function deleteComment(id: string): Promise<void> {
  return request<void>(`/comments/${id}`, { method: 'DELETE' }, 'required')
}

// --- users -----------------------------------------------------------------

/** GET /users/:username — public profile plus graph counts. */
export function getProfile(username: string): Promise<UserProfile> {
  return request<UserProfile>(`/users/${encodeURIComponent(username)}`, {}, 'optional')
}

/** GET /users — discovery, optionally filtered by free text. */
export function searchUsers(params?: {
  search?: string
  page?: number
  limit?: number
}): Promise<Paginated<DiscoverUser>> {
  return request<Paginated<DiscoverUser>>(
    `/users${query({ search: params?.search, page: params?.page, limit: params?.limit })}`,
    {},
    'optional',
  )
}

/** GET /users/:username/posts — one handle's timeline. */
export function getUserPosts(
  username: string,
  params?: { page?: number; limit?: number },
): Promise<Paginated<Post>> {
  return request<Paginated<Post>>(
    `/users/${encodeURIComponent(username)}/posts${query({
      page: params?.page,
      limit: params?.limit,
    })}`,
    {},
    'optional',
  )
}

/** POST /users/:id/follow — idempotent. */
export function followUser(id: string): Promise<void> {
  return request<void>(`/users/${id}/follow`, { method: 'POST' }, 'required')
}

/** DELETE /users/:id/follow — idempotent. */
export function unfollowUser(id: string): Promise<void> {
  return request<void>(`/users/${id}/follow`, { method: 'DELETE' }, 'required')
}

/** POST /users/:id/block — idempotent. */
export function blockUser(id: string): Promise<void> {
  return request<void>(`/users/${id}/block`, { method: 'POST' }, 'required')
}

/** DELETE /users/:id/block — idempotent. */
export function unblockUser(id: string): Promise<void> {
  return request<void>(`/users/${id}/block`, { method: 'DELETE' }, 'required')
}

// --- notifications ---------------------------------------------------------

/** GET /notifications — the inbox, newest first. */
export function listNotifications(params?: {
  unread?: boolean
  page?: number
  limit?: number
}): Promise<Paginated<Notification>> {
  return request<Paginated<Notification>>(
    `/notifications${query({ unread: params?.unread, page: params?.page, limit: params?.limit })}`,
    {},
    'required',
  )
}

/** GET /notifications/unread-count — the badge number. */
export function getUnreadCount(): Promise<{ count: number }> {
  return request<{ count: number }>('/notifications/unread-count', {}, 'required')
}

/** POST /notifications/read — mark specific ids, or everything when omitted. */
export function markNotificationsRead(ids?: string[]): Promise<{ updated: number }> {
  return request<{ updated: number }>(
    '/notifications/read',
    { method: 'POST', body: JSON.stringify(ids?.length ? { ids } : {}) },
    'required',
  )
}

// --- media -----------------------------------------------------------------

/** POST /media — uploads one image or video (field "file"). */
export function uploadMedia(file: File): Promise<MediaDto> {
  const body = new FormData()
  body.append('file', file)
  return request<MediaDto>('/media', { method: 'POST', body }, 'required')
}
