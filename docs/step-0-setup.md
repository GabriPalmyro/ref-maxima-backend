## STEP 0 — Project Setup

Create a NestJS project with TypeScript strict mode.

### Install dependencies:
```bash
npm i @nestjs/config @prisma/client class-validator class-transformer
npm i -D prisma
```

### Configure:
- `PrismaModule` (global) with `PrismaService` extending `OnModuleInit` calling `$connect()`
- `ConfigModule.forRoot({ isGlobal: true })` in AppModule
- Global `ValidationPipe` with `whitelist: true, transform: true`
- CORS enabled for all origins (we'll restrict later)

### Create `.env.example`:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/mentoria
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-client-id
AI_API_URL=https://your-ai-wrapper.com/v1/chat/completions
AI_API_KEY=your-ai-key
AI_MODEL=gpt-4o
```

### Create folder structure (empty modules, just the files):
```
src/
  common/decorators/
  common/guards/
  common/interfaces/
  prisma/prisma.module.ts
  prisma/prisma.service.ts
  auth/
  mentor/
  mentee/
  invite/
  report/
  report/prompts/
  message-card/
  ai/
```

### Create `prisma/schema.prisma` with this exact content:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum AuthProvider {
  EMAIL
  GOOGLE
  APPLE
}

enum OnboardingStatus {
  PENDING
  PHASE_1
  PHASE_2
  PHASE_3
  COMPLETED
}

enum ReportType {
  PERSONA_ICP
  POSICIONAMENTO
  MENSAGEM_CLARA
}

enum ReportStatus {
  PROCESSING
  COMPLETED
  ERROR
}

enum MessageCardType {
  DESEJO
  PROBLEMA
  GUIA
  PLANO
  CONVITE
  SUCESSO
  FRACASSO
}

enum InviteStatus {
  ACTIVE
  USED
  EXPIRED
}

model Mentor {
  id           String       @id @default(uuid())
  email        String       @unique
  passwordHash String?      @map("password_hash")
  authProvider AuthProvider  @default(EMAIL) @map("auth_provider")
  googleId     String?      @unique @map("google_id")
  name         String
  avatarUrl    String?      @map("avatar_url")
  phone        String?
  isActive     Boolean      @default(true) @map("is_active")
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  mentees     Mentee[]
  inviteCodes InviteCode[]

  @@map("mentors")
}

model InviteCode {
  id             String       @id @default(uuid())
  mentorId       String       @map("mentor_id")
  code           String       @unique
  status         InviteStatus @default(ACTIVE)
  menteeName     String?      @map("mentee_name")
  menteeEmail    String?      @map("mentee_email")
  usedByMenteeId String?      @unique @map("used_by_mentee_id")
  usedAt         DateTime?    @map("used_at")
  expiresAt      DateTime     @map("expires_at")
  createdAt      DateTime     @default(now()) @map("created_at")

  mentor       Mentor  @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  usedByMentee Mentee? @relation(fields: [usedByMenteeId], references: [id])

  @@index([mentorId])
  @@map("invite_codes")
}

model Mentee {
  id           String       @id @default(uuid())
  mentorId     String       @map("mentor_id")
  authProvider AuthProvider  @map("auth_provider")
  socialId     String       @map("social_id")
  email        String
  name         String
  avatarUrl    String?      @map("avatar_url")
  phone        String?

  onboardingStatus OnboardingStatus @default(PENDING) @map("onboarding_status")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  mentor       Mentor            @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  inviteCode   InviteCode?
  reports      GeneratedReport[]
  messageCards MessageCard[]

  @@unique([authProvider, socialId])
  @@unique([mentorId, email])
  @@index([mentorId])
  @@map("mentees")
}

model GeneratedReport {
  id       String       @id @default(uuid())
  menteeId String       @map("mentee_id")
  type     ReportType
  status   ReportStatus @default(PROCESSING)
  title    String

  answers           Json
  rawResponse       String?  @map("raw_response") @db.Text
  structuredContent Json?    @map("structured_content")
  renderedHtml      String?  @map("rendered_html") @db.Text

  errorMessage String? @map("error_message")
  modelUsed    String? @map("model_used")
  version      Int     @default(1)

  generatedAt DateTime @default(now()) @map("generated_at")

  mentee       Mentee        @relation(fields: [menteeId], references: [id], onDelete: Cascade)
  messageCards MessageCard[]

  @@unique([menteeId, type])
  @@index([menteeId])
  @@map("generated_reports")
}

model MessageCard {
  id           String          @id @default(uuid())
  reportId     String          @map("report_id")
  menteeId     String          @map("mentee_id")
  cardType     MessageCardType @map("card_type")
  sortOrder    Int             @map("sort_order")
  title        String
  subtitle     String?
  bodyText     String          @map("body_text") @db.Text
  bulletPoints Json?           @map("bullet_points")
  createdAt    DateTime        @default(now()) @map("created_at")

  report GeneratedReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
  mentee Mentee          @relation(fields: [menteeId], references: [id], onDelete: Cascade)

  @@unique([reportId, cardType])
  @@index([menteeId])
  @@index([reportId])
  @@map("message_cards")
}
```

Run `npx prisma generate`. Do NOT run migrate yet.
