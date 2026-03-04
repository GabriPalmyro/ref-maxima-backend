export class DraftPostResponse {
  position!: number;
  imageUrl!: string;
  originalPostId?: string;
}

export class DraftResponse {
  id!: string;
  menteeId!: string;
  fullName!: string | null;
  biography!: string | null;
  profilePicUrl!: string | null;
  externalUrl!: string | null;
  posts!: DraftPostResponse[];
  updatedAt!: Date;
}
