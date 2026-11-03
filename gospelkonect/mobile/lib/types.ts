/** Wire types shared by the API client, session store and screens. */

export type ReactionType = 'LIKE' | 'AMEN' | 'LOVE';

export type NotificationType =
  | 'NEW_FOLLOWER'
  | 'MENTION'
  | 'COMMENT'
  | 'REPLY'
  | 'REACTION';

export interface PublicUser {
  id: string;
  name: string;
  username: string;
  // Only returned on your own account / profile.
  email?: string | null;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
}

export interface UserProfile extends PublicUser {
  counts: {
    followers: number;
    following: number;
  };
  isFollowing: boolean;
  isFollowedBy: boolean;
  isBlocking: boolean;
  isBlockedBy: boolean;
}

export interface DiscoverUser extends PublicUser {
  isFollowing: boolean;
  isFollowedBy: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export type MediaKind = 'IMAGE' | 'VIDEO';

export interface MediaDto {
  id: string;
  kind: MediaKind;
  mimeType: string;
  bytes: number;
  url: string;
}

export interface PostAuthor {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

export type ReactionTally = Record<ReactionType, number>;

export interface Post {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  media: MediaDto[];
  commentCount: number;
  reactions: ReactionTally;
  viewerReaction: ReactionType | null;
}

export interface ReactionState {
  reactions: ReactionTally;
  viewerReaction: ReactionType | null;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export interface FeedMeta {
  limit: number;
  total: number;
  totalPages: number;
  page?: number;
  nextCursor: string | null;
}

export interface FeedPage {
  items: Post[];
  meta: FeedMeta;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
}

export interface Notification {
  id: string;
  type: NotificationType;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: PostAuthor;
}
