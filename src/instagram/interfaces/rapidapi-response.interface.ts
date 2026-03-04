// NOTE: This interface is based on common Instagram scraper API patterns.
// The EXACT field paths MUST be verified against a real RapidAPI response
// before finalization. Store the raw response (rawResponse field) to
// insulate against schema changes.

export interface RapidApiProfileResponse {
  // Common top-level fields across Instagram scraper APIs
  username?: string;
  full_name?: string;
  biography?: string;
  profile_pic_url?: string;
  profile_pic_url_hd?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  is_private?: boolean;
  is_verified?: boolean;
  category?: string;
  external_url?: string;

  // Posts — shape varies by provider. Common patterns:
  // Option A: edge_owner_to_timeline_media.edges[]
  // Option B: posts[] or media[]
  // The normalizer must handle whichever shape the actual API returns.
  // Alternative follower/following count fields (Graph API format)
  edge_followed_by?: { count?: number };
  edge_follow?: { count?: number };

  edge_owner_to_timeline_media?: {
    count?: number;
    edges?: Array<{
      node?: {
        display_url?: string;
        thumbnail_src?: string;
        edge_liked_by?: { count?: number };
        edge_media_to_comment?: { count?: number };
        edge_media_to_caption?: {
          edges?: Array<{ node?: { text?: string } }>;
        };
      };
    }>;
  };

  // HD profile pic (used by normalizer: raw.hd_profile_pic_url_info?.url)
  hd_profile_pic_url_info?: { url?: string };

  // Allow any additional fields from the raw response
  [key: string]: any;
}

export interface RapidApiPost {
  imageUrl: string;
  likeCount: number;
  commentCount: number;
  caption: string | null;
}
