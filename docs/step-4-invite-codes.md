## STEP 4 — Invite Code Module

Install:
```bash
npm i nanoid@3
```

### Files:

**`invite.module.ts`**: imports PrismaModule, providers: InviteService, controllers: InviteController

**`invite/dto/create-invite.dto.ts`**: menteeName? (@IsOptional @IsString), menteeEmail? (@IsOptional @IsEmail)

**`invite.service.ts`**:

- `generate(mentorId, dto?)`:
  - Use `customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 6)` from nanoid
  - Create InviteCode with expiresAt = now + 7 days
  - Return the invite code object

- `listByMentor(mentorId)`:
  - Find all invite codes for this mentor, ordered by createdAt desc
  - Return array

- `revoke(mentorId, inviteId)`:
  - Find invite by id AND mentorId (security)
  - If status !== ACTIVE → throw BadRequestException
  - Update status to EXPIRED
  - Return updated invite

**`invite.controller.ts`**: all routes protected with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('mentor')`

```
POST   /invites     → generate (body: CreateInviteDto)
GET    /invites     → listByMentor
DELETE /invites/:id → revoke
```

Use `@CurrentUser()` to get mentorId from JWT payload.sub.

Register InviteModule in AppModule.
