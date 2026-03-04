## STEP 5 — Mentor Module (Profile + Mentee Management)

**`mentor.module.ts`**: imports PrismaModule, providers: MentorService, controllers: MentorController

**`mentor/dto/update-mentor.dto.ts`**: name? (@IsOptional @IsString), phone? (@IsOptional @IsString), avatarUrl? (@IsOptional @IsString)

**`mentor.service.ts`**:

- `getProfile(mentorId)`: findUnique, exclude passwordHash from response
- `updateProfile(mentorId, dto)`: update only provided fields
- `listMentees(mentorId)`: findMany where mentorId, select id, name, email, avatarUrl, onboardingStatus, createdAt. Order by createdAt desc.
- `getMenteeDetail(mentorId, menteeId)`: findFirst where id AND mentorId (security check). Include reports (select id, type, status, title, generatedAt) and messageCards count.

**`mentor.controller.ts`**: all `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('mentor')`

```
GET  /mentor/profile      → getProfile
PUT  /mentor/profile      → updateProfile
GET  /mentor/mentees      → listMentees
GET  /mentor/mentees/:id  → getMenteeDetail
```

Register MentorModule in AppModule.
