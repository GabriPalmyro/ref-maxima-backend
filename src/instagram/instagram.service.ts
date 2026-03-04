// ASSUMPTION: RapidAPI "Instagram Scraper Stable API" response field paths
// are based on common Instagram scraper patterns. The raw response is stored
// in InstagramProfile.rawResponse so normalization can be updated if the
// actual API returns different field names. See normalizeRapidApiResponse().

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramApiService } from './instagram-api.service';
import {
  InstagramProfileResponse,
  InstagramProfileData,
  InstagramPostData,
} from './dto/instagram-profile.dto';
import { RapidApiProfileResponse } from './interfaces/rapidapi-response.interface';
import { normalizeInstagramHandle } from './utils/handle-normalizer';
import { InstagramProfile } from '@prisma/client';

const THROTTLE_MINUTES = 15; // Minimum minutes between re-scrapes

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly api: InstagramApiService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get Instagram profile for a mentee.
   *
   * Flow:
   * 1. Look up mentee — if no instagram handle, return no_handle
   * 2. Check cache — if cached and not forcing refresh, return cached
   * 3. If forcing refresh — check throttle (15 min minimum)
   * 4. Scrape from RapidAPI — handle not_found, private, success
   * 5. On scrape error with existing cache — return stale data
   */
  async getProfile(
    menteeId: string,
    forceRefresh = false,
  ): Promise<InstagramProfileResponse> {
    // 1. Look up mentee
    const mentee = await this.prisma.mentee.findUnique({
      where: { id: menteeId },
    });

    if (!mentee) {
      throw new NotFoundException('Mentee not found');
    }

    // 2. Check if mentee has an Instagram handle
    if (!mentee.instagram) {
      return { status: 'no_handle' };
    }

    const normalizedHandle = normalizeInstagramHandle(mentee.instagram);
    if (!normalizedHandle) {
      return { status: 'no_handle' };
    }

    // 3. Look up cached profile
    const cached = await this.prisma.instagramProfile.findUnique({
      where: { menteeId },
    });

    // 4. If cached exists and not forcing refresh, return cached
    if (cached && !forceRefresh) {
      return this.toDto(cached);
    }

    // 5. If cached exists and forcing refresh, check throttle
    if (cached && forceRefresh) {
      const minutesSinceLastScrape = this.minutesSince(cached.scrapedAt);
      if (minutesSinceLastScrape < THROTTLE_MINUTES) {
        this.logger.debug(
          `Throttled: ${minutesSinceLastScrape.toFixed(1)} min since last scrape (min ${THROTTLE_MINUTES})`,
        );
        const dto = this.toDto(cached);
        if (dto.status === 'success') {
          return { ...dto, throttled: true };
        }
        return dto;
      }
    }

    // 6. Scrape from RapidAPI
    return this.scrapeAndStore(menteeId, normalizedHandle, cached);
  }

  /**
   * Update mentee's Instagram handle and trigger a fresh scrape.
   *
   * Flow:
   * 1. Normalize handle — reject invalid
   * 2. Update mentee.instagram in DB
   * 3. Delete old cached profile (handle changed, old data is wrong)
   * 4. Trigger fresh scrape with new handle
   */
  async updateHandle(
    menteeId: string,
    rawHandle: string,
  ): Promise<InstagramProfileResponse> {
    // 1. Normalize
    const normalizedHandle = normalizeInstagramHandle(rawHandle);
    if (!normalizedHandle) {
      throw new BadRequestException(
        'Invalid Instagram handle. Use @username, a profile URL, or just the username.',
      );
    }

    // Verify mentee exists
    const mentee = await this.prisma.mentee.findUnique({
      where: { id: menteeId },
    });
    if (!mentee) {
      throw new NotFoundException('Mentee not found');
    }

    // 2. Update mentee record
    await this.prisma.mentee.update({
      where: { id: menteeId },
      data: { instagram: normalizedHandle },
    });

    // 3. Delete old cached profile (ignore if none exists)
    await this.prisma.instagramProfile
      .delete({ where: { menteeId } })
      .catch(() => {
        // No existing profile to delete — that's fine
      });

    // 4. Trigger fresh scrape
    return this.getProfile(menteeId, true);
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  /**
   * Scrape from RapidAPI, normalize, store, and return DTO.
   * On error, falls back to stale cached data if available.
   */
  private async scrapeAndStore(
    menteeId: string,
    normalizedHandle: string,
    existingCache: InstagramProfile | null,
  ): Promise<InstagramProfileResponse> {
    try {
      const raw = await this.api.fetchProfile(normalizedHandle);
      const rawPosts = raw ? await this.api.fetchPosts(normalizedHandle) : [];

      // Not found
      if (!raw) {
        // Store not_found status so we don't hammer the API
        await this.prisma.instagramProfile.upsert({
          where: { menteeId },
          create: {
            menteeId,
            username: normalizedHandle,
            scrapeStatus: 'not_found',
            scrapedAt: new Date(),
          },
          update: {
            username: normalizedHandle,
            scrapeStatus: 'not_found',
            scrapedAt: new Date(),
          },
        });
        return { status: 'not_found', username: normalizedHandle };
      }

      // Private profile
      if (raw.is_private) {
        const { profile } = this.normalizeRapidApiResponse(raw);
        const now = new Date();

        await this.prisma.instagramProfile.upsert({
          where: { menteeId },
          create: {
            menteeId,
            username: normalizedHandle,
            fullName: profile.fullName,
            biography: profile.biography,
            profilePicUrl: profile.profilePicUrl,
            followerCount: profile.followerCount ?? 0,
            followingCount: profile.followingCount ?? 0,
            postCount: profile.postCount ?? 0,
            isVerified: profile.isVerified ?? false,
            isPrivate: true,
            category: profile.category,
            externalUrl: profile.externalUrl,
            posts: [],
            rawResponse: raw as any,
            scrapeStatus: 'private',
            scrapedAt: now,
          },
          update: {
            username: normalizedHandle,
            fullName: profile.fullName,
            biography: profile.biography,
            profilePicUrl: profile.profilePicUrl,
            followerCount: profile.followerCount ?? 0,
            followingCount: profile.followingCount ?? 0,
            postCount: profile.postCount ?? 0,
            isVerified: profile.isVerified ?? false,
            isPrivate: true,
            category: profile.category,
            externalUrl: profile.externalUrl,
            posts: [],
            rawResponse: raw as any,
            scrapeStatus: 'private',
            scrapedAt: now,
          },
        });

        return {
          status: 'private',
          profile,
          scrapedAt: now.toISOString(),
        };
      }

      // Success — public profile
      const { profile, posts } = this.normalizeRapidApiResponse(raw, rawPosts);
      const now = new Date();

      await this.prisma.instagramProfile.upsert({
        where: { menteeId },
        create: {
          menteeId,
          username: normalizedHandle,
          fullName: profile.fullName,
          biography: profile.biography,
          profilePicUrl: profile.profilePicUrl,
          followerCount: profile.followerCount ?? 0,
          followingCount: profile.followingCount ?? 0,
          postCount: profile.postCount ?? 0,
          isVerified: profile.isVerified ?? false,
          isPrivate: false,
          category: profile.category,
          externalUrl: profile.externalUrl,
          posts: posts as any,
          rawResponse: raw as any,
          scrapeStatus: 'success',
          scrapedAt: now,
        },
        update: {
          username: normalizedHandle,
          fullName: profile.fullName,
          biography: profile.biography,
          profilePicUrl: profile.profilePicUrl,
          followerCount: profile.followerCount ?? 0,
          followingCount: profile.followingCount ?? 0,
          postCount: profile.postCount ?? 0,
          isVerified: profile.isVerified ?? false,
          isPrivate: false,
          category: profile.category,
          externalUrl: profile.externalUrl,
          posts: posts as any,
          rawResponse: raw as any,
          scrapeStatus: 'success',
          scrapedAt: now,
        },
      });

      return {
        status: 'success',
        profile: profile as InstagramProfileData,
        posts,
        scrapedAt: now.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Scrape failed for mentee ${menteeId}: ${error instanceof Error ? error.message : error}`,
      );

      // If we have cached data, return it as stale
      if (existingCache) {
        const staleDto = this.toDto(existingCache);
        if (staleDto.status === 'success') {
          return {
            status: 'error',
            message: 'Failed to refresh Instagram data. Showing cached data.',
            cachedProfile: staleDto.profile,
            cachedPosts: staleDto.posts,
            scrapedAt: staleDto.scrapedAt,
            stale: true,
          };
        }
      }

      // No cache — re-throw so controller returns 500
      throw error;
    }
  }

  /**
   * Map a Prisma InstagramProfile record to the response DTO.
   */
  private toDto(cached: InstagramProfile): InstagramProfileResponse {
    if (cached.scrapeStatus === 'not_found') {
      return { status: 'not_found', username: cached.username };
    }

    if (cached.isPrivate) {
      return {
        status: 'private',
        profile: {
          username: cached.username,
          fullName: cached.fullName,
          biography: cached.biography,
          profilePicUrl: cached.profilePicUrl,
          followerCount: cached.followerCount,
          followingCount: cached.followingCount,
          postCount: cached.postCount,
          isVerified: cached.isVerified,
          category: cached.category,
          externalUrl: cached.externalUrl,
        },
        scrapedAt: cached.scrapedAt.toISOString(),
      };
    }

    return {
      status: 'success',
      profile: {
        username: cached.username,
        fullName: cached.fullName,
        biography: cached.biography,
        profilePicUrl: cached.profilePicUrl,
        followerCount: cached.followerCount,
        followingCount: cached.followingCount,
        postCount: cached.postCount,
        isVerified: cached.isVerified,
        category: cached.category,
        externalUrl: cached.externalUrl,
      },
      posts: (cached.posts as unknown as InstagramPostData[]) ?? [],
      scrapedAt: cached.scrapedAt.toISOString(),
    };
  }

  /**
   * Normalize the raw RapidAPI response into typed profile and posts data.
   *
   * This method handles field path variations across different Instagram scraper APIs.
   * The raw response is always stored in rawResponse for debugging if normalization
   * needs updating.
   */
  private normalizeRapidApiResponse(
    raw: RapidApiProfileResponse,
    rawPosts: any[] = [],
  ): {
    profile: Partial<InstagramProfileData>;
    posts: InstagramPostData[];
  } {
    // Profile fields — verified against real RapidAPI response
    const profile: Partial<InstagramProfileData> = {
      username: raw.username ?? undefined,
      fullName: raw.full_name ?? null,
      biography: raw.biography ?? null,
      profilePicUrl:
        raw.hd_profile_pic_url_info?.url ?? raw.profile_pic_url ?? null,
      followerCount: raw.follower_count ?? 0,
      followingCount: raw.following_count ?? 0,
      postCount: raw.media_count ?? 0,
      isVerified: raw.is_verified ?? false,
      category: raw.category ?? null,
      externalUrl: raw.external_url ?? null,
    };

    // Posts from separate /get_ig_user_posts.php endpoint
    // Shape: posts[].node.image_versions2.candidates[0].url, .caption.text
    const posts: InstagramPostData[] = rawPosts.slice(0, 12).map((post: any) => {
      const node = post.node ?? post;
      const imageUrl =
        node.image_versions2?.candidates?.[0]?.url ??
        node.display_url ??
        node.thumbnail_src ??
        '';
      return {
        imageUrl,
        likeCount: node.like_count ?? node.edge_liked_by?.count ?? 0,
        commentCount:
          node.comment_count ?? node.edge_media_to_comment?.count ?? 0,
        caption: node.caption?.text ?? null,
      };
    });

    return { profile, posts };
  }

  /**
   * Calculate minutes elapsed since a given date.
   */
  private minutesSince(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60);
  }
}
