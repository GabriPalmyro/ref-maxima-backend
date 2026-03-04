## STEP 1 — JWT Auth Infrastructure

Install:
```bash
npm i @nestjs/jwt @nestjs/passport passport passport-jwt
npm i -D @types/passport-jwt
```

Create these files:

### 1. `src/common/interfaces/jwt-payload.interface.ts`
Three payload types:
- `MentorPayload`: `{ sub: string, role: 'mentor', email: string }`
- `MenteePayload`: `{ sub: string, role: 'mentee', mentorId: string, email: string }`
- `UnlinkedPayload`: `{ sub: string, role: 'unlinked', email: string, name: string, avatarUrl?: string, provider: 'GOOGLE' | 'APPLE' }`
- Union type `JwtPayload = MentorPayload | MenteePayload | UnlinkedPayload`

### 2. `src/common/decorators/current-user.decorator.ts`
`createParamDecorator` that extracts `request.user` (the JWT payload).

### 3. `src/common/decorators/roles.decorator.ts`
`@Roles(...roles: string[])` using `SetMetadata('roles', roles)`.

### 4. `src/common/guards/jwt-auth.guard.ts`
Extends `AuthGuard('jwt')`.

### 5. `src/common/guards/roles.guard.ts`
`CanActivate` guard. Gets roles from `Reflector`, compares with `request.user.role`. If no roles set, allow all.

### 6. `src/auth/strategies/jwt.strategy.ts`
Passport JWT strategy. Extracts token from `Authorization: Bearer`. Validates using `JWT_SECRET` from ConfigService. Returns the payload as-is (it already has sub, role, etc).

### 7. `src/auth/auth.module.ts`
- Imports: `JwtModule.registerAsync` (secret + expiresIn from env), `PassportModule.register({ defaultStrategy: 'jwt' })`
- Exports: `JwtModule`
- Providers: `JwtStrategy`

Register AuthModule in AppModule.
