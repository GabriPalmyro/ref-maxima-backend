import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';
import { PrismaService } from '../prisma/prisma.service';
import { MentorRegisterDto } from './dto/mentor-register.dto';
import { MentorLoginDto } from './dto/mentor-login.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import {
  MentorPayload,
  MenteePayload,
  UnlinkedPayload,
} from '../common/interfaces/jwt-payload.interface';

interface SocialProfile {
  socialId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;
  private readonly appleJwksClient: jwksRsa.JwksClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.googleClientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(this.googleClientId);
    this.appleJwksClient = jwksRsa({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      rateLimit: true,
    });
  }

  // ── Mentor ────────────────────────────────────────

  async mentorRegister(dto: MentorRegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const mentor = await this.prisma.mentor.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        authProvider: 'EMAIL',
      },
    });

    const payload: MentorPayload = {
      sub: mentor.id,
      role: 'mentor',
      email: mentor.email,
    };

    return { accessToken: this.jwt.sign(payload) };
  }

  async mentorLogin(dto: MentorLoginDto) {
    const mentor = await this.prisma.mentor.findUnique({
      where: { email: dto.email },
    });

    if (!mentor || !mentor.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, mentor.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: MentorPayload = {
      sub: mentor.id,
      role: 'mentor',
      email: mentor.email,
    };

    return { accessToken: this.jwt.sign(payload) };
  }

  async mentorGoogleLogin(accessToken: string) {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const userInfo = await response.json();
    if (!userInfo.email || !userInfo.sub) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!tokenInfoRes.ok) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const tokenInfo = await tokenInfoRes.json();
    if (tokenInfo.aud !== this.googleClientId) {
      throw new UnauthorizedException('Token not issued for this application');
    }

    const { email, sub: googleId, picture } = userInfo;

    const mentor = await this.prisma.mentor.findUnique({
      where: { email },
    });

    if (!mentor) {
      throw new ForbiddenException('Mentor not registered');
    }

    if (!mentor.googleId) {
      await this.prisma.mentor.update({
        where: { id: mentor.id },
        data: {
          googleId,
          authProvider: 'GOOGLE',
          avatarUrl: mentor.avatarUrl ?? picture,
        },
      });
    }

    const payload: MentorPayload = {
      sub: mentor.id,
      role: 'mentor',
      email: mentor.email,
    };

    return { accessToken: this.jwt.sign(payload) };
  }

  // ── Mentee ────────────────────────────────────────

  private async validateGoogleToken(idToken: string): Promise<SocialProfile> {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new UnauthorizedException('Invalid Google token');
    }

    return {
      socialId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email.split('@')[0],
      avatarUrl: payload.picture,
    };
  }

  private async validateAppleToken(idToken: string): Promise<SocialProfile> {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
      throw new UnauthorizedException('Invalid Apple token');
    }

    const signingKey = await this.appleJwksClient.getSigningKey(
      decoded.header.kid,
    );
    const publicKey = signingKey.getPublicKey();

    const payload = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
    }) as jwt.JwtPayload;

    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid Apple token');
    }

    return {
      socialId: payload.sub,
      email: payload.email as string,
      name: (payload.name as string) ?? (payload.email as string).split('@')[0],
    };
  }

  async menteeSocialLogin(dto: SocialLoginDto) {
    const profile =
      dto.provider === 'GOOGLE'
        ? await this.validateGoogleToken(dto.idToken)
        : await this.validateAppleToken(dto.idToken);

    const mentee = await this.prisma.mentee.findUnique({
      where: {
        authProvider_socialId: {
          authProvider: dto.provider,
          socialId: profile.socialId,
        },
      },
    });

    if (mentee && mentee.isActive) {
      const payload: MenteePayload = {
        sub: mentee.id,
        role: 'mentee',
        mentorId: mentee.mentorId,
        email: mentee.email,
        name: mentee.name,
      };

      return { accessToken: this.jwt.sign(payload), needsInviteCode: false };
    }

    const unlinkedPayload: UnlinkedPayload = {
      sub: profile.socialId,
      role: 'unlinked',
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      provider: dto.provider,
    };

    const tempToken = this.jwt.sign(unlinkedPayload, { expiresIn: '15m' });

    return { tempToken, needsInviteCode: true };
  }

  async menteeConnect(payload: UnlinkedPayload, code: string) {
    const invite = await this.prisma.inviteCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!invite) {
      throw new BadRequestException('Invalid invite code');
    }

    if (invite.status !== 'ACTIVE') {
      throw new BadRequestException('Invite code already used');
    }

    // If the invite was generated for a specific mentee (from the dashboard),
    // link the social account to that existing record — the invite code is
    // the source of truth for the connection.
    let mentee;

    try {
      if (invite.forMenteeId) {
        mentee = await this.prisma.mentee.update({
          where: { id: invite.forMenteeId },
          data: {
            authProvider: payload.provider,
            socialId: payload.sub,
            name: payload.name,
            email: payload.email,
            avatarUrl: payload.avatarUrl,
          },
        });
      } else {
        mentee = await this.prisma.mentee.create({
          data: {
            mentorId: invite.mentorId,
            authProvider: payload.provider,
            socialId: payload.sub,
            email: payload.email,
            name: payload.name,
            avatarUrl: payload.avatarUrl,
          },
        });
      }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          // forMenteeId points to a deleted mentee (e.g. mentor deleted before connecting)
          throw new BadRequestException(
            'Este convite não é mais válido. Peça um novo código ao seu mentor.',
          );
        }
        if (err.code === 'P2002') {
          // Stale inactive record with same socialId — reactivate and re-link it
          const existing = await this.prisma.mentee.findUnique({
            where: {
              authProvider_socialId: {
                authProvider: payload.provider,
                socialId: payload.sub,
              },
            },
          });
          if (existing) {
            // Clear any previous usedByMenteeId pointing to this mentee
            // so the unique constraint allows the new invite to claim it
            await this.prisma.inviteCode.updateMany({
              where: { usedByMenteeId: existing.id },
              data: { usedByMenteeId: null },
            });
            mentee = await this.prisma.mentee.update({
              where: { id: existing.id },
              data: {
                mentorId: invite.mentorId,
                isActive: true,
                name: payload.name,
                email: payload.email,
                avatarUrl: payload.avatarUrl,
              },
            });
          } else {
            throw new InternalServerErrorException('Erro ao conectar conta.');
          }
        }
      }
      if (!mentee) throw new InternalServerErrorException('Erro ao conectar conta.');
    }

    await this.prisma.inviteCode.update({
      where: { id: invite.id },
      data: {
        status: 'USED',
        usedByMenteeId: mentee.id,
        usedAt: new Date(),
      },
    });

    const jwtPayload: MenteePayload = {
      sub: mentee.id,
      role: 'mentee',
      mentorId: invite.mentorId,
      email: mentee.email,
      name: mentee.name,
    };

    return { accessToken: this.jwt.sign(jwtPayload) };
  }
}
