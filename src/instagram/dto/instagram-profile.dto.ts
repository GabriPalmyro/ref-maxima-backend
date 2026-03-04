export interface InstagramPostData {
  imageUrl: string;
  likeCount: number;
  commentCount: number;
  caption: string | null;
}

export interface InstagramProfileData {
  username: string;
  fullName: string | null;
  biography: string | null;
  profilePicUrl: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isVerified: boolean;
  category: string | null;
  externalUrl: string | null;
}

// Discriminated union — mobile app switches on `status`
export type InstagramProfileResponse =
  | {
      status: 'success';
      profile: InstagramProfileData;
      posts: InstagramPostData[];
      scrapedAt: string; // ISO timestamp
      stale?: boolean;
      throttled?: boolean;
    }
  | {
      status: 'private';
      profile: Partial<InstagramProfileData>;
      scrapedAt: string;
      stale?: boolean;
    }
  | { status: 'not_found'; username: string }
  | { status: 'no_handle' }
  | {
      status: 'error';
      message: string;
      cachedProfile?: InstagramProfileData;
      cachedPosts?: InstagramPostData[];
      scrapedAt?: string;
      stale: true;
    };
