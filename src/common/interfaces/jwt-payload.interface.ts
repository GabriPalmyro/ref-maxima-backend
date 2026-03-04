export interface MentorPayload {
  sub: string;
  role: 'mentor';
  email: string;
}

export interface MenteePayload {
  sub: string;
  role: 'mentee';
  mentorId: string;
  email: string;
  name: string;
}

export interface UnlinkedPayload {
  sub: string;
  role: 'unlinked';
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'GOOGLE' | 'APPLE';
}

export type JwtPayload = MentorPayload | MenteePayload | UnlinkedPayload;
