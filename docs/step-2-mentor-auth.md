## STEP 2 — Mentor Auth (Email/Password + Google)

Install:
```bash
npm i bcryptjs google-auth-library
npm i -D @types/bcryptjs
```

### DTOs:

`mentor-register.dto.ts`: email (@IsEmail), password (@MinLength(6)), name (@IsString @IsNotEmpty)

`mentor-login.dto.ts`: email (@IsEmail), password (@IsString)

`google-login.dto.ts`: idToken (@IsString @IsNotEmpty)

### `auth.service.ts` — add these methods:

**mentorRegister(dto)**:
- Hash password with bcrypt (salt 12)
- Create mentor with authProvider EMAIL
- Sign JWT: `{ sub: mentor.id, role: 'mentor', email: mentor.email }`
- Return `{ accessToken }`

**mentorLogin(dto)**:
- Find mentor by email
- If not found or no passwordHash → throw UnauthorizedException
- bcrypt.compare → if false throw UnauthorizedException
- Sign JWT same as above
- Return `{ accessToken }`

**mentorGoogleLogin(idToken)**:
- Create OAuth2Client with GOOGLE_CLIENT_ID from env
- Call `verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })`
- Extract: email, name, picture, sub (googleId) from payload
- Find mentor by email in DB
- If NOT found → throw ForbiddenException('Mentor not registered')
- If found and no googleId → update mentor with googleId, set authProvider to GOOGLE
- Sign JWT and return `{ accessToken }`

**IMPORTANT**: Google login for mentors does NOT create new accounts. The mentor must already exist in the DB (registered via email/password or created manually).

### `auth.controller.ts` — routes:

```
POST /auth/mentor/register  → mentorRegister
POST /auth/mentor/login     → mentorLogin
POST /auth/mentor/google    → mentorGoogleLogin
```

All public (no guards).
