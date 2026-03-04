# Implementation Strategy — Claude Code

## Overview

10 steps (0-9). Each step = 1 Claude Code conversation.
Copy the step's `.md` file content → paste into Claude Code → wait → test → next step.

## Execution Order

```
Step 0 → Project Setup + Prisma schema          [no dependencies]
Step 1 → JWT auth infrastructure                 [depends: 0]
Step 2 → Mentor auth (email/pwd + Google)        [depends: 1]
Step 3 → Mentee auth (Google/Apple + code)       [depends: 1]
Step 4 → Invite code module                      [depends: 1]
Step 5 → Mentor CRUD                             [depends: 1]
Step 6 → AI service wrapper                      [depends: 0]
Step 7 → Report generation                       [depends: 1, 6]
Step 8 → Message cards (read only)               [depends: 7]
Step 9 → Mentor views for mentee data            [depends: 5, 7, 8]
```

Steps 2-6 can run in parallel (they don't depend on each other).
Steps 7-9 must be sequential.

## Token Optimization Tips

1. **Step 0 has the full Prisma schema** — never paste it again. Claude Code will see it in the project.
2. **One step per conversation.** If it errors, fix in same conversation. When done, new conversation for next step.
3. **Don't ask for explanations.** The prompts already specify exactly what to build.
4. **Don't paste previous step code.** Just say "see existing files" if Claude Code needs context.
5. **Test each step before moving on.** Prevents cascading rework.

## Test Checklist Per Step

- Step 0: `npx prisma generate` succeeds, `npm run start:dev` boots
- Step 1: No errors on startup, JWT strategy registered
- Step 2: POST /auth/mentor/register returns JWT, POST /auth/mentor/login works
- Step 3: POST /auth/mentee/social returns tempToken, POST /auth/mentee/connect creates mentee
- Step 4: POST /invites creates code, GET /invites lists them
- Step 5: GET /mentor/profile returns data, GET /mentor/mentees lists mentees
- Step 6: AI service can be injected (test with mock URL)
- Step 7: POST /reports/generate returns full report, MENSAGEM_CLARA creates 7 cards
- Step 8: GET /message-cards returns cards array
- Step 9: GET /mentor/mentees/:id/reports returns mentee's reports

## Database Migration

After Step 0, when you have a running PostgreSQL:
```bash
npx prisma migrate dev --name init
```

## Files Created Per Step

| Step | Files |
|------|-------|
| 0 | prisma/schema.prisma, src/prisma/*, .env.example, app.module.ts, main.ts |
| 1 | src/common/interfaces/*, src/common/decorators/*, src/common/guards/*, src/auth/strategies/*, src/auth/auth.module.ts |
| 2 | src/auth/dto/mentor-*.dto.ts, src/auth/dto/google-login.dto.ts, src/auth/auth.service.ts, src/auth/auth.controller.ts |
| 3 | src/auth/dto/social-login.dto.ts, src/auth/dto/connect-code.dto.ts (extends auth.service + auth.controller) |
| 4 | src/invite/* |
| 5 | src/mentor/* |
| 6 | src/ai/* |
| 7 | src/report/*, src/report/prompts/* |
| 8 | src/message-card/* |
| 9 | (extends src/mentor/mentor.service.ts + mentor.controller.ts) |
