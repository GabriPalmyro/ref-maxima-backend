import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { RapidApiProfileResponse } from './interfaces/rapidapi-response.interface';

@Injectable()
export class InstagramApiService {
  private readonly logger = new Logger(InstagramApiService.name);

  constructor(private readonly httpService: HttpService) {}

  async fetchProfile(
    username: string,
  ): Promise<RapidApiProfileResponse | null> {
    this.logger.log(`Fetching Instagram profile for: ${username}`);

    try {
      const { data } = await firstValueFrom(
        this.httpService
          .post(
            '/ig_get_fb_profile.php',
            `username_or_url=${encodeURIComponent(username)}`,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            },
          )
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                `RapidAPI error for ${username}: ${error.message}`,
                error.response?.data,
              );
              throw error;
            }),
          ),
      );

      this.logger.log(
        `RapidAPI profile received for ${username} — has username: ${!!data?.username}`,
      );

      if (!data || data.error || (data.status && data.status === 'fail')) {
        this.logger.warn(`RapidAPI returned empty/fail for ${username}`);
        return null;
      }

      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        if (status === 404 || status === 400) {
          this.logger.warn(
            `Profile not found for ${username} (HTTP ${status})`,
          );
          return null;
        }
      }
      throw error;
    }
  }

  async fetchPosts(username: string, count = 20): Promise<any[]> {
    this.logger.log(
      `Fetching Instagram posts for: ${username} (count=${count})`,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService
          .post(
            '/get_ig_user_posts.php',
            `username_or_url=${encodeURIComponent(username)}&count=${count}`,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            },
          )
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                `RapidAPI posts error for ${username}: ${error.message}`,
              );
              throw error;
            }),
          ),
      );

      return data?.posts ?? [];
    } catch (error) {
      this.logger.warn(
        `Failed to fetch posts for ${username}, returning empty`,
      );
      return [];
    }
  }
}
