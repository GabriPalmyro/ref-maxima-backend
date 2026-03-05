import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  private static readonly TILE_SIZE = 300;
  private static readonly GRID_COLS = 4;
  private static readonly GRID_ROWS = 3;
  private static readonly PROFILE_SIZE = 400;
  private static readonly DOWNLOAD_TIMEOUT = 8000;
  private static readonly PLACEHOLDER_COLOR = { r: 40, g: 40, b: 40 };

  /**
   * Download an image from a URL and return it as a Buffer.
   * Returns null on failure (timeout, HTTP error, etc.)
   */
  async downloadImage(url: string): Promise<Buffer | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        ImageProcessingService.DOWNLOAD_TIMEOUT,
      );

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(
          `Image download failed (HTTP ${response.status}): ${url}`,
        );
        return null;
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (err) {
      this.logger.warn(
        `Image download error: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  /**
   * Build a 4x3 composite grid (1200x900) from up to 12 image buffers.
   * Each tile is 300x300, cover-cropped. Missing slots get a dark grey placeholder.
   */
  async buildGrid(buffers: (Buffer | null)[]): Promise<Buffer> {
    const { TILE_SIZE, GRID_COLS, GRID_ROWS, PLACEHOLDER_COLOR } =
      ImageProcessingService;

    const width = TILE_SIZE * GRID_COLS;
    const height = TILE_SIZE * GRID_ROWS;

    // Resize each buffer to a tile, or create a placeholder
    const tiles = await Promise.all(
      Array.from({ length: GRID_COLS * GRID_ROWS }, async (_, i) => {
        const buf = buffers[i] ?? null;
        if (buf) {
          try {
            return await sharp(buf)
              .resize(TILE_SIZE, TILE_SIZE, { fit: 'cover' })
              .jpeg({ quality: 80 })
              .toBuffer();
          } catch {
            this.logger.warn(`Failed to process tile ${i}, using placeholder`);
          }
        }
        // Placeholder tile
        return sharp({
          create: {
            width: TILE_SIZE,
            height: TILE_SIZE,
            channels: 3,
            background: PLACEHOLDER_COLOR,
          },
        })
          .jpeg({ quality: 80 })
          .toBuffer();
      }),
    );

    // Composite all tiles onto a blank canvas
    const composites = tiles.map((tile, i) => ({
      input: tile,
      left: (i % GRID_COLS) * TILE_SIZE,
      top: Math.floor(i / GRID_COLS) * TILE_SIZE,
    }));

    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: PLACEHOLDER_COLOR,
      },
    })
      .composite(composites)
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  /**
   * Resize a profile picture to 400x400 cover-cropped JPEG.
   */
  async processProfilePic(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(
        ImageProcessingService.PROFILE_SIZE,
        ImageProcessingService.PROFILE_SIZE,
        {
          fit: 'cover',
        },
      )
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  /**
   * Convert a buffer to a base64-encoded string.
   */
  toBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }
}
