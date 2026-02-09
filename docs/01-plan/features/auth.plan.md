# Auth Feature Plan

> **Feature**: auth
> **Version**: 0.1.0
> **Author**: Claude
> **Date**: 2026-02-09
> **Status**: Draft

---

## 1. Overview

### 1.1 Background

BDJ Inventory currently has **zero authentication**. All pages and API routes are publicly accessible. Shopify API tokens, inventory data, and business operations are unprotected. This feature adds authentication (signup/login) and role-based authorization.

### 1.2 Goals

- Google OAuth and email/password signup & login
- Role-based access control: Admin, User, Pending
- Sign-up approval workflow (Pending → User → Admin)
- Admin-only access to Shops management
- Seed admin account: `peter.kim@sokimnewyork.com`

### 1.3 Non-Goals

- Password reset / forgot password (Phase 2)
- Email verification (Phase 2)
- Two-factor authentication (Phase 2)
- API key authentication for external services

---

## 2. Requirements

### 2.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Google OAuth sign-up / login | Must |
| FR-02 | Email + password sign-up / login | Must |
| FR-03 | Three roles: ADMIN, USER, PENDING | Must |
| FR-04 | New sign-up → PENDING status by default | Must |
| FR-05 | PENDING users see "waiting for approval" page | Must |
| FR-06 | Admin can view all users list | Must |
| FR-07 | Admin can approve PENDING → USER | Must |
| FR-08 | Admin can promote USER → ADMIN | Must |
| FR-09 | Admin can demote ADMIN → USER | Should |
| FR-10 | Only ADMIN can access /shops and /shops/** | Must |
| FR-11 | USER + ADMIN can access /products, /inventory | Must |
| FR-12 | Unauthenticated users redirect to /login | Must |
| FR-13 | User menu in header (name, avatar, logout) | Must |
| FR-14 | Seed admin: peter.kim@sokimnewyork.com | Must |
| FR-15 | i18n support for all auth pages (en/ko) | Must |

### 2.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | Session-based auth (JWT token via cookies) |
| NFR-02 | bcrypt password hashing (cost factor 12) |
| NFR-03 | CSRF protection via NextAuth |
| NFR-04 | OAuth secrets stored in environment variables |

---

## 3. Technical Approach

### 3.1 Library: NextAuth v5 (Auth.js)

**Why NextAuth v5:**
- De-facto standard for Next.js authentication
- Built-in Google OAuth provider
- Credentials provider for email/password
- Prisma adapter for database sessions
- Works with Next.js 16 middleware
- Session management via JWT cookies

### 3.2 Dependencies

```
next-auth@5           # Auth.js v5
@auth/prisma-adapter  # Prisma adapter for NextAuth
bcryptjs              # Password hashing
@types/bcryptjs       # TypeScript types
```

### 3.3 Database Schema (New Models)

```
User
├── id            String   @id @default(cuid())
├── name          String?
├── email         String   @unique
├── emailVerified DateTime?
├── image         String?
├── passwordHash  String?          # null for OAuth-only users
├── role          UserRole @default(PENDING)
├── createdAt     DateTime @default(now())
├── updatedAt     DateTime @updatedAt
├── accounts      Account[]
└── sessions      Session[]

Account (NextAuth OAuth)
├── id                 String  @id @default(cuid())
├── userId             String
├── type               String
├── provider           String
├── providerAccountId  String
├── refresh_token      String?
├── access_token       String?
├── expires_at         Int?
├── token_type         String?
├── scope              String?
├── id_token           String?
├── session_state      String?
└── @@unique([provider, providerAccountId])

Session (NextAuth)
├── id           String   @id @default(cuid())
├── sessionToken String   @unique
├── userId       String
├── expires      DateTime

VerificationToken (NextAuth)
├── identifier String
├── token      String
├── expires    DateTime
└── @@unique([identifier, token])

enum UserRole { PENDING, USER, ADMIN }
```

### 3.4 Auth Flow

```
Sign-up (Google):
  Google OAuth → callback → create User(role=PENDING) → redirect /pending

Sign-up (Email):
  Form → POST /api/auth/signup → hash password → create User(role=PENDING) → redirect /pending

Login (Google):
  Google OAuth → callback → check role → PENDING? /pending : /products

Login (Email):
  Credentials provider → verify password → check role → PENDING? /pending : /products

Approval:
  Admin → /admin/users → approve PENDING user → role=USER
```

### 3.5 Route Protection Matrix

| Route | ADMIN | USER | PENDING | Guest |
|-------|:-----:|:----:|:-------:|:-----:|
| /login, /signup | Redirect | Redirect | Redirect | Allow |
| /pending | Redirect | Redirect | Allow | Redirect /login |
| /shops/** | Allow | Redirect /products | Redirect /pending | Redirect /login |
| /admin/** | Allow | Redirect /products | Redirect /pending | Redirect /login |
| /products | Allow | Allow | Redirect /pending | Redirect /login |
| /inventory/** | Allow | Allow | Redirect /pending | Redirect /login |
| /api/shops/** | Allow | 403 | 401 | 401 |
| /api/admin/** | Allow | 403 | 401 | 401 |
| /api/products/** | Allow | Allow | 401 | 401 |
| /api/inventory/** | Allow | Allow | 401 | 401 |

### 3.6 Environment Variables (New)

```env
NEXTAUTH_URL=https://localhost:3000
NEXTAUTH_SECRET=<random-secret>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
```

---

## 4. Implementation Sprints

### Sprint 1: Core Auth Setup (Backend + DB)
**Scope**: Database models, NextAuth config, auth API, seed admin

| # | Task | Type | Files |
|---|------|------|-------|
| 1 | Add User, Account, Session, VerificationToken to Prisma schema | MODIFY | `prisma/schema.prisma` |
| 2 | Run migration | CMD | `npx prisma migrate dev` |
| 3 | Install dependencies | CMD | `npm install next-auth@5 @auth/prisma-adapter bcryptjs` |
| 4 | Create NextAuth config | NEW | `src/auth.ts` |
| 5 | Create NextAuth route handler | NEW | `src/app/api/auth/[...nextauth]/route.ts` |
| 6 | Create email signup API | NEW | `src/app/api/auth/signup/route.ts` |
| 7 | Seed admin user in DB | MODIFY | `prisma/seed.ts` |
| 8 | Add auth env vars to .env.example | MODIFY | `.env.example` |

### Sprint 2: Auth UI (Login, Signup, Pending)
**Scope**: Auth pages, forms, pending approval page

| # | Task | Type | Files |
|---|------|------|-------|
| 1 | Auth layout (no sidebar) | NEW | `src/app/(auth)/layout.tsx` |
| 2 | Login page (Google + Email form) | NEW | `src/app/(auth)/login/page.tsx` |
| 3 | Signup page (Google + Email form) | NEW | `src/app/(auth)/signup/page.tsx` |
| 4 | Pending approval page | NEW | `src/app/(auth)/pending/page.tsx` |
| 5 | i18n: auth namespace (en/ko) | NEW | `src/messages/{en,ko}/auth.json` |

### Sprint 3: Route Protection + Admin Panel
**Scope**: Middleware, API protection, admin user management, header user menu

| # | Task | Type | Files |
|---|------|------|-------|
| 1 | Update middleware for auth + i18n | MODIFY | `src/middleware.ts` |
| 2 | Create auth helper for API routes | NEW | `src/lib/auth.ts` |
| 3 | Protect all API routes (shops=admin, others=user+) | MODIFY | `src/app/api/shops/route.ts` + all API routes |
| 4 | Admin users list API | NEW | `src/app/api/admin/users/route.ts` |
| 5 | Admin user role update API | NEW | `src/app/api/admin/users/[id]/role/route.ts` |
| 6 | Admin user management page | NEW | `src/app/(dashboard)/admin/users/page.tsx` |
| 7 | User menu component (avatar, name, logout) | NEW | `src/components/UserMenu.tsx` |
| 8 | Update dashboard header | MODIFY | `src/app/(dashboard)/layout.tsx` |
| 9 | Update nav: hide Shops for non-admin | MODIFY | `src/app/(dashboard)/layout.tsx` |
| 10 | Update root redirect (/ → /login or /products) | MODIFY | `src/app/page.tsx` |
| 11 | i18n: admin namespace (en/ko) | NEW | `src/messages/{en,ko}/admin.json` |

---

## 5. File Map Summary

| Type | Count | Files |
|------|:-----:|-------|
| NEW | 12 | auth.ts, [...nextauth]/route.ts, signup/route.ts, (auth)/layout.tsx, login/page.tsx, signup/page.tsx, pending/page.tsx, lib/auth.ts, admin/users API (2), admin/users/page.tsx, UserMenu.tsx |
| MODIFY | 8 | schema.prisma, seed.ts, middleware.ts, .env.example, dashboard/layout.tsx, page.tsx, auth.json (en/ko) + all API routes |
| i18n | 4 | auth.json (en/ko), admin.json (en/ko) |

---

## 6. Success Criteria

- [ ] Google OAuth signup/login works
- [ ] Email signup/login works
- [ ] New users land on /pending page
- [ ] Admin can approve pending users at /admin/users
- [ ] Admin can promote/demote users
- [ ] /shops only accessible to ADMIN
- [ ] /products, /inventory accessible to USER + ADMIN
- [ ] Unauthenticated users redirect to /login
- [ ] User menu shows name + logout in header
- [ ] Shops nav hidden for non-admin
- [ ] peter.kim@sokimnewyork.com seeded as ADMIN
- [ ] `npm run build` passes with 0 errors
- [ ] i18n en/ko for all auth/admin pages

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| NextAuth v5 + Next.js 16 middleware compatibility | High | Already confirmed middleware works (i18n uses it) |
| Google OAuth requires HTTPS for callback | Medium | Already using HTTPS dev server (192.168.1.42:3000) |
| Prisma migration may conflict with existing data | Medium | Migration is additive (new tables only) |
| OAuth callback URL configuration | Low | Document in plan, configure in Google Cloud Console |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-09 | Initial plan | Claude |
