import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '../storage/storage.interface';
import { UpdateDraftDto } from './dto/update-draft.dto';
import { DraftResponse } from './dto/draft-response.dto';

@Injectable()
export class InstagramDraftService {
  private readonly logger = new Logger(InstagramDraftService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async getDraft(menteeId: string): Promise<DraftResponse | null> {
    const draft = await this.prisma.instagramDraft.findUnique({
      where: { menteeId },
    });
    if (!draft) return null;
    return this.toResponse(draft);
  }

  async uploadImage(
    menteeId: string,
    file: Buffer,
    contentType: string,
    type: 'profile' | 'post',
  ): Promise<string> {
    const filename =
      type === 'profile'
        ? `drafts/${menteeId}/profile-pic.jpg`
        : `drafts/${menteeId}/posts/${crypto.randomUUID()}.jpg`;

    return this.storage.upload(filename, file, contentType);
  }

  async updateDraft(
    menteeId: string,
    dto: UpdateDraftDto,
  ): Promise<DraftResponse> {
    // Load current draft to diff for cleanup
    const current = await this.prisma.instagramDraft.findUnique({
      where: { menteeId },
    });

    const newPosts = dto.posts ?? [];

    // Diff: find image URLs that were in old state but not in new state
    if (current) {
      const oldPosts = (current.posts as any[]) || [];
      const oldUrls = new Set(oldPosts.map((p) => p.imageUrl));
      const newUrls = new Set(newPosts.map((p) => p.imageUrl));

      // Collect removed URLs (only our storage URLs, not Instagram CDN)
      const removedPaths: string[] = [];
      for (const url of oldUrls) {
        if (!newUrls.has(url) && this.isOurStorageUrl(url)) {
          removedPaths.push(this.extractPath(url));
        }
      }

      // Check profile pic change
      if (
        current.profilePicUrl &&
        dto.profilePicUrl !== undefined &&
        dto.profilePicUrl !== current.profilePicUrl &&
        this.isOurStorageUrl(current.profilePicUrl)
      ) {
        removedPaths.push(this.extractPath(current.profilePicUrl));
      }

      // Delete orphaned files
      if (removedPaths.length > 0) {
        await this.storage.deleteMany(removedPaths).catch((err) => {
          this.logger.warn('Failed to cleanup orphaned files', err);
        });
      }
    }

    const draft = await this.prisma.instagramDraft.upsert({
      where: { menteeId },
      create: {
        menteeId,
        fullName: dto.fullName,
        biography: dto.biography,
        profilePicUrl: dto.profilePicUrl,
        externalUrl: dto.externalUrl,
        posts: newPosts as any,
      },
      update: {
        fullName: dto.fullName,
        biography: dto.biography,
        profilePicUrl: dto.profilePicUrl,
        externalUrl: dto.externalUrl,
        posts: newPosts as any,
      },
    });

    return this.toResponse(draft);
  }

  async deleteDraft(menteeId: string): Promise<void> {
    const draft = await this.prisma.instagramDraft.findUnique({
      where: { menteeId },
    });
    if (!draft) return;

    // Delete all stored files for this mentee's draft
    const posts = (draft.posts as any[]) || [];
    const paths = posts
      .map((p) => p.imageUrl)
      .filter((url) => this.isOurStorageUrl(url))
      .map((url) => this.extractPath(url));

    if (draft.profilePicUrl && this.isOurStorageUrl(draft.profilePicUrl)) {
      paths.push(this.extractPath(draft.profilePicUrl));
    }

    if (paths.length > 0) {
      await this.storage.deleteMany(paths).catch((err) => {
        this.logger.warn('Failed to cleanup files on draft delete', err);
      });
    }

    await this.prisma.instagramDraft.delete({ where: { menteeId } });
  }

  async seedFromScrapedData(menteeId: string): Promise<DraftResponse> {
    const existing = await this.prisma.instagramDraft.findUnique({
      where: { menteeId },
    });
    if (existing) return this.toResponse(existing);

    const scraped = await this.prisma.instagramProfile.findUnique({
      where: { menteeId },
    });
    if (!scraped) throw new NotFoundException('No Instagram profile found');

    const posts = (scraped.posts as any[]) || [];
    const draftPosts = posts.slice(0, 12).map((post, index) => ({
      position: index,
      imageUrl: post.imageUrl || post.image_url,
      originalPostId: post.id || null,
    }));

    const draft = await this.prisma.instagramDraft.create({
      data: {
        menteeId,
        fullName: scraped.fullName,
        biography: scraped.biography,
        profilePicUrl: scraped.profilePicUrl,
        externalUrl: scraped.externalUrl,
        posts: draftPosts,
      },
    });

    return this.toResponse(draft);
  }

  private isOurStorageUrl(url: string): boolean {
    // Match Supabase storage URLs — adapt if provider changes
    return url.includes('supabase') && url.includes('/drafts/');
  }

  private extractPath(url: string): string {
    // Extract storage path from full public URL
    // e.g., https://xxx.supabase.co/storage/v1/object/public/drafts/menteeId/posts/uuid.jpg
    //     -> drafts/menteeId/posts/uuid.jpg
    const marker = '/object/public/drafts/';
    const idx = url.indexOf(marker);
    if (idx === -1) return url;
    return 'drafts/' + url.substring(idx + marker.length);
  }

  private toResponse(draft: any): DraftResponse {
    return {
      id: draft.id,
      menteeId: draft.menteeId,
      fullName: draft.fullName ?? null,
      biography: draft.biography,
      profilePicUrl: draft.profilePicUrl,
      externalUrl: draft.externalUrl,
      posts: (draft.posts as any[]) || [],
      updatedAt: draft.updatedAt,
    };
  }
}
