## STEP 3 — Mentee Auth (Google/Apple + Invite Code)

Install:
```bash
npm i jsonwebtoken jwks-rsa
npm i -D @types/jsonwebtoken
```

### DTOs:

`social-login.dto.ts`: provider (@IsEnum, values: GOOGLE | APPLE), idToken (@IsString)

`connect-code.dto.ts`: code (@IsString @Length(6, 6))

### Add to `auth.service.ts`:

**validateGoogleToken(idToken)** (reuse from step 2 if exists):
- verifyIdToken with google-auth-library
- Return `{ socialId: payload.sub, email: payload.email, name: payload.name, avatarUrl: payload.picture }`

**validateAppleToken(idToken)**:
- Use jwks-rsa to fetch Apple public keys from `https://appleid.apple.com/auth/keys`
- Verify JWT with jsonwebtoken using the fetched key
- Extract: sub (socialId), email from token payload
- Apple only sends name on FIRST login, so name may be null
- Return `{ socialId: payload.sub, email: payload.email, name: payload.name || payload.email.split('@')[0] }`

**menteeSocialLogin(dto: SocialLoginDto)**:
- If provider GOOGLE → validateGoogleToken(idToken)
- If provider APPLE → validateAppleToken(idToken)
- Search mentee by `{ authProvider: provider, socialId }`
- **If mentee exists** (returning user):
  - Sign JWT: `{ sub: mentee.id, role: 'mentee', mentorId: mentee.mentorId, email: mentee.email }`
  - Return `{ accessToken, needsInviteCode: false }`
- **If mentee NOT found** (first login):
  - Sign temporary JWT (15min expiry): `{ sub: socialId, role: 'unlinked', email, name, avatarUrl, provider }`
  - Return `{ tempToken, needsInviteCode: true }`

**menteeConnect(unlinkedPayload: UnlinkedPayload, code: string)**:
- Find InviteCode by `code.toUpperCase()`
- Validate: exists? status === ACTIVE? expiresAt > now?
- If invalid → throw BadRequestException with specific message
- Create Mentee: `{ mentorId: invite.mentorId, authProvider: payload.provider, socialId: payload.sub, email: payload.email, name: payload.name, avatarUrl: payload.avatarUrl }`
- Update InviteCode: `{ status: USED, usedByMenteeId: mentee.id, usedAt: new Date() }`
- Sign JWT: `{ sub: mentee.id, role: 'mentee', mentorId: invite.mentorId, email }`
- Return `{ accessToken }`

### Routes in `auth.controller.ts`:

```
POST /auth/mentee/social   → menteeSocialLogin (public)
POST /auth/mentee/connect  → menteeConnect (requires JWT with role 'unlinked')
```

For the connect route, use @UseGuards(JwtAuthGuard) and validate that request.user.role === 'unlinked' inside the method.
