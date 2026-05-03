# LeetCode Company Tracker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app for tracking LeetCode problems by company with notes, progress tracking, fuzzy search, and auth.

**Architecture:** Next.js 16 App Router with server components for data fetching, server actions for mutations, Prisma + PostgreSQL for data, Better Auth for authentication, pg_trgm for fuzzy search.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Prisma, PostgreSQL (Neon/Supabase), Better Auth, React Bits, shadcn, react-markdown, react-syntax-highlighter, recharts

**Spec:** `docs/superpowers/specs/2026-05-03-leetcode-tracker-design.md`

**Package Manager:** bun

---

## Chunk 1: Database Foundation

### Task 1: Install and Configure Prisma

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/prisma/schema.prisma`
- Create: `frontend/.env`
- Create: `frontend/.gitignore` (update if exists)
- Create: `frontend/lib/db.ts`

- [ ] **Step 1: Install Prisma dependencies**

```bash
cd frontend && bun add prisma @prisma/client
```

- [ ] **Step 2: Initialize Prisma**

```bash
cd frontend && bunx prisma init
```

This creates `prisma/schema.prisma` and `.env.example`.

- [ ] **Step 3: Create .env with database URL**

Create `frontend/.env`:
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?pgbouncer=true"
BETTER_AUTH_SECRET="change-me-to-a-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

- [ ] **Step 4: Ensure .env is in .gitignore**

Check `frontend/.gitignore` contains `.env`. If not, add it. This is critical — the `.env` file contains secrets and must never be committed.

- [ ] **Step 5: Write the Prisma schema**

Replace `frontend/prisma/schema.prisma` with:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum TimePeriod {
  THIRTY_DAYS
  THREE_MONTHS
  SIX_MONTHS
  MORE_THAN_SIX_MONTHS
  ALL
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  accounts      Account[]
  userQuestions UserQuestion[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Account {
  id                   String    @id @default(cuid())
  userId               String
  accountId            String
  providerId           String
  accessToken          String?
  refreshToken         String?
  accessTokenExpiresAt DateTime?
  refreshTokenExpiresAt DateTime?
  scope                String?
  idToken              String?
  password             String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@index([userId])
}

model Company {
  id        String     @id @default(cuid())
  name      String     @unique
  slug      String     @unique
  questions Question[]

  @@index([slug])
}

model Question {
  id             String     @id @default(cuid())
  title          String
  leetcodeUrl    String
  difficulty     Difficulty
  topics         String[]
  frequency      Float
  acceptanceRate Float
  companyId      String
  timePeriod     TimePeriod
  createdAt      DateTime   @default(now())

  company       Company        @relation(fields: [companyId], references: [id])
  userQuestions  UserQuestion[]

  @@unique([leetcodeUrl, companyId, timePeriod])
  @@index([companyId])
  @@index([difficulty])
}

model UserQuestion {
  id         String    @id @default(cuid())
  userId     String
  questionId String
  solved     Boolean   @default(false)
  solvedAt   DateTime?
  notes      String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([userId, questionId])
  @@index([userId])
  @@index([questionId])
}
```

- [ ] **Step 6: Create Prisma client singleton**

Create `frontend/lib/db.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 7: Run migration**

```bash
cd frontend && bunx prisma migrate dev --name init
```

Expected: Migration created, tables created in database. This also auto-generates the Prisma client.

- [ ] **Step 8: Verify Prisma client was generated**

```bash
cd frontend && bunx prisma generate
```

Expected: "Generated Prisma Client" message. Run this if Step 7 didn't auto-generate.

- [ ] **Step 9: Enable pg_trgm extension and create fuzzy search index**

Run this SQL against the database **outside of a transaction** — use the Supabase/Neon SQL editor or `psql` directly. Do NOT run through Prisma or inside any transaction block, because `CREATE INDEX CONCURRENTLY` cannot run inside a transaction.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY idx_question_title_trgm ON "Question" USING gin(title gin_trgm_ops);
```

- [ ] **Step 10: Commit**

```bash
git add frontend/prisma/schema.prisma frontend/lib/db.ts frontend/.gitignore frontend/package.json frontend/bun.lock
git commit -m "feat: add Prisma schema with User, Company, Question, UserQuestion models"
```

---

### Task 2: CSV Import Seed Script

**Files:**
- Create: `frontend/prisma/seed.ts`
- Modify: `frontend/package.json`

- [ ] **Step 1: Install csv-parse**

```bash
cd frontend && bun add csv-parse
```

- [ ] **Step 2: Write the seed script**

Create `frontend/prisma/seed.ts`:
```typescript
import { PrismaClient, Difficulty, TimePeriod } from "@prisma/client";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const TIME_PERIOD_MAP: Record<string, TimePeriod> = {
  "1. Thirty Days.csv": TimePeriod.THIRTY_DAYS,
  "2. Three Months.csv": TimePeriod.THREE_MONTHS,
  "3. Six Months.csv": TimePeriod.SIX_MONTHS,
  "4. More Than Six Months.csv": TimePeriod.MORE_THAN_SIX_MONTHS,
  "5. All.csv": TimePeriod.ALL,
};

const DIFFICULTY_MAP: Record<string, Difficulty> = {
  EASY: Difficulty.EASY,
  MEDIUM: Difficulty.MEDIUM,
  HARD: Difficulty.HARD,
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const SKIP_DIRS = new Set([
  "frontend",
  "node_modules",
  ".git",
  "docs",
  ".github",
]);

async function main() {
  const repoRoot = path.resolve(__dirname, "../..");
  const entries = fs.readdirSync(repoRoot, { withFileTypes: true });
  const companyDirs = entries.filter(
    (e) => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith(".")
  );

  console.log(`Found ${companyDirs.length} company directories`);

  let totalCompanies = 0;
  let totalQuestions = 0;
  let skippedFiles = 0;
  let skippedRows = 0;

  for (const dir of companyDirs) {
    const companyPath = path.join(repoRoot, dir.name);
    const companySlug = slugify(dir.name);

    const company = await prisma.company.upsert({
      where: { slug: companySlug },
      update: { name: dir.name },
      create: { name: dir.name, slug: companySlug },
    });

    totalCompanies++;

    for (const [fileName, timePeriod] of Object.entries(TIME_PERIOD_MAP)) {
      const filePath = path.join(companyPath, fileName);

      if (!fs.existsSync(filePath)) {
        skippedFiles++;
        continue;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      let records: string[][];

      try {
        records = parse(content, {
          skip_empty_lines: true,
          relax_column_count: true,
        });
      } catch (err) {
        console.error(`  ERROR: Failed to parse ${filePath}: ${err}`);
        skippedFiles++;
        continue;
      }

      const dataRows = records.slice(1);
      let imported = 0;

      for (const row of dataRows) {
        const [difficulty, title, frequency, acceptanceRate, link, topicsRaw] =
          row;

        if (!title || !link || !difficulty) {
          skippedRows++;
          continue;
        }

        const difficultyEnum = DIFFICULTY_MAP[difficulty.trim().toUpperCase()];
        if (!difficultyEnum) {
          skippedRows++;
          continue;
        }

        const topics = topicsRaw
          ? topicsRaw.split(",").map((t: string) => t.trim()).filter(Boolean)
          : [];

        try {
          await prisma.question.upsert({
            where: {
              leetcodeUrl_companyId_timePeriod: {
                leetcodeUrl: link.trim(),
                companyId: company.id,
                timePeriod,
              },
            },
            update: {
              title: title.trim(),
              difficulty: difficultyEnum,
              topics,
              frequency: parseFloat(frequency) || 0,
              acceptanceRate: parseFloat(acceptanceRate) || 0,
            },
            create: {
              title: title.trim(),
              leetcodeUrl: link.trim(),
              difficulty: difficultyEnum,
              topics,
              frequency: parseFloat(frequency) || 0,
              acceptanceRate: parseFloat(acceptanceRate) || 0,
              companyId: company.id,
              timePeriod,
            },
          });
          imported++;
        } catch (err) {
          console.error(
            `  ERROR: Failed to upsert "${title}" in ${filePath}: ${err}`
          );
          skippedRows++;
        }
      }

      totalQuestions += imported;
      console.log(`  ${dir.name}/${fileName}: ${imported} questions`);
    }

    if (totalCompanies % 50 === 0) {
      console.log(`Progress: ${totalCompanies}/${companyDirs.length} companies`);
    }
  }

  console.log("\n--- Import Complete ---");
  console.log(`Companies: ${totalCompanies}`);
  console.log(`Questions imported: ${totalQuestions}`);
  console.log(`Files skipped: ${skippedFiles}`);
  console.log(`Rows skipped: ${skippedRows}`);
}

main()
  .catch((e) => {
    console.error("Seed script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 3: Configure seed command in package.json**

Add to `frontend/package.json`:
```json
"prisma": {
  "seed": "bunx tsx prisma/seed.ts"
}
```

- [ ] **Step 4: Install tsx for running TypeScript seed**

```bash
cd frontend && bun add -D tsx
```

- [ ] **Step 5: Test seed script**

```bash
cd frontend && bunx prisma db seed
```

Expected: Console logs showing companies processed and questions imported. Should complete without errors.

- [ ] **Step 6: Verify data in database**

```bash
cd frontend && bunx prisma studio
```

Expected: Company and Question tables populated with data.

- [ ] **Step 7: Commit**

```bash
git add frontend/prisma/seed.ts frontend/package.json frontend/bun.lock
git commit -m "feat: add CSV import seed script for LeetCode questions"
```

---

## Chunk 2: Authentication

### Task 3: Better Auth Setup

**Files:**
- Create: `frontend/lib/auth.ts`
- Create: `frontend/lib/auth-client.ts`
- Create: `frontend/app/api/auth/[...all]/route.ts`
- Create: `frontend/middleware.ts`

- [ ] **Step 1: Install Better Auth**

```bash
cd frontend && bun add better-auth
```

- [ ] **Step 2: Create server auth config**

Create `frontend/lib/auth.ts`:
```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
```

- [ ] **Step 3: Create client auth config**

Create `frontend/lib/auth-client.ts`:
```typescript
"use client";

import { createAuthClient } from "better-auth/react";

export const { signIn, signUp, signOut, useSession } = createAuthClient();
```

- [ ] **Step 4: Create API route handler**

Create `frontend/app/api/auth/[...all]/route.ts`:
```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 5: Create middleware for route protection**

Create `frontend/middleware.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/dashboard"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for session token cookie existence as a quick gate.
  // Full session validation happens in server actions via auth.api.getSession().
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

Note: The middleware checks cookie existence only. Full session validation (expiry, token validity) happens in server actions via `auth.api.getSession()`. This is a performance tradeoff — middleware runs on every request, so we avoid a DB call there.

- [ ] **Step 6: Verify auth server starts without errors**

```bash
cd frontend && bun run dev
```

Expected: Server starts, `/api/auth/session` endpoint responds (returns null if no session).

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/auth.ts frontend/lib/auth-client.ts frontend/app/api/auth middleware.ts frontend/package.json frontend/bun.lock
git commit -m "feat: add Better Auth with email/password + Google OAuth"
```

---

### Task 4: Auth Pages

**Files:**
- Create: `frontend/app/(auth)/layout.tsx`
- Create: `frontend/app/(auth)/login/page.tsx`
- Create: `frontend/app/(auth)/register/page.tsx`
- Create: `frontend/components/auth/login-form.tsx`
- Create: `frontend/components/auth/register-form.tsx`

- [ ] **Step 1: Install shadcn components needed for forms**

```bash
cd frontend && bunx shadcn@latest add button input card label separator
```

- [ ] **Step 2: Create auth layout**

Create `frontend/app/(auth)/layout.tsx`:
```typescript
import { Card } from "@/components/ui/card";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md p-6">{children}</Card>
    </div>
  );
}
```

- [ ] **Step 3: Create login form component**

Create `frontend/components/auth/login-form.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn.email({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message || "Login failed");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogle() {
    setError("");
    await signIn.social({ provider: "google", callbackURL: "/dashboard" });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </Button>
      <Button type="button" variant="outline" onClick={handleGoogle}>
        Continue with Google
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Create login page**

Create `frontend/app/(auth)/login/page.tsx`:
```typescript
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to track your progress
        </p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="underline">
          Register
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Create register form component**

Create `frontend/components/auth/register-form.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signUp.email({ name, email, password });

    setLoading(false);

    if (error) {
      setError(error.message || "Registration failed");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogle() {
    setError("");
    await signUp.social({ provider: "google", callbackURL: "/dashboard" });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating account..." : "Create Account"}
      </Button>
      <Button type="button" variant="outline" onClick={handleGoogle}>
        Continue with Google
      </Button>
    </form>
  );
}
```

- [ ] **Step 6: Create register page**

Create `frontend/app/(auth)/register/page.tsx`:
```typescript
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-sm text-muted-foreground">
          Create an account to start tracking
        </p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Test auth flow**

```bash
cd frontend && bun run dev
```

Navigate to `/register`, create account, verify redirect to `/dashboard`. Navigate to `/login`, sign in, verify redirect.

- [ ] **Step 8: Commit**

```bash
git add "frontend/app/(auth)" frontend/components/auth frontend/lib/auth-client.ts
git commit -m "feat: add login and register pages with email/password + Google"
```

---

## Chunk 3: Data Layer

### Task 5: Server Actions

**Files:**
- Create: `frontend/actions/questions.ts`
- Create: `frontend/actions/stats.ts`

- [ ] **Step 1: Create questions server actions**

Create `frontend/actions/questions.ts`:
```typescript
"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { TimePeriod } from "@prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getCompanies(): Promise<
  ActionResult<{
    companies: { id: string; name: string; slug: string; questionCount: number }[];
    totalQuestions: number;
    totalCompanies: number;
  }>
> {
  try {
    const companies = await prisma.company.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: { name: "asc" },
    });

    const totalQuestions = await prisma.question.count();

    return {
      success: true,
      data: {
        companies: companies.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          questionCount: c._count.questions,
        })),
        totalQuestions,
        totalCompanies: companies.length,
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch companies" };
  }
}

export async function getCompanyQuestions(
  slug: string,
  timePeriod: TimePeriod = "ALL",
  page: number = 1,
  pageSize: number = 50
): Promise<
  ActionResult<{
    questions: {
      id: string;
      title: string;
      leetcodeUrl: string;
      difficulty: "EASY" | "MEDIUM" | "HARD";
      topics: string[];
      frequency: number;
      acceptanceRate: number;
      solved: boolean;
    }[];
    totalPages: number;
    currentPage: number;
  }>
> {
  try {
    const company = await prisma.company.findUnique({ where: { slug } });

    if (!company) {
      return {
        success: true,
        data: { questions: [], totalPages: 0, currentPage: 1 },
      };
    }

    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      userId = session?.user?.id || null;
    } catch {
      // Not authenticated
    }

    const where = { companyId: company.id, timePeriod };
    const totalQuestions = await prisma.question.count({ where });
    const totalPages = Math.ceil(totalQuestions / pageSize);

    const questions = await prisma.question.findMany({
      where,
      orderBy: [{ frequency: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: userId
        ? { userQuestions: { where: { userId }, select: { solved: true, solvedAt: true } } }
        : undefined,
    });

    return {
      success: true,
      data: {
        questions: questions.map((q) => ({
          id: q.id,
          title: q.title,
          leetcodeUrl: q.leetcodeUrl,
          difficulty: q.difficulty,
          topics: q.topics,
          frequency: q.frequency,
          acceptanceRate: q.acceptanceRate,
          solved: userId ? q.userQuestions?.[0]?.solved || false : false,
        })),
        totalPages,
        currentPage: page,
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch questions" };
  }
}

export async function toggleSolved(
  questionId: string
): Promise<ActionResult<{ solved: boolean; solvedAt: Date | null }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;
    const existing = await prisma.userQuestion.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });

    if (existing) {
      const updated = await prisma.userQuestion.update({
        where: { id: existing.id },
        data: { solved: !existing.solved, solvedAt: !existing.solved ? new Date() : null },
      });
      return { success: true, data: { solved: updated.solved, solvedAt: updated.solvedAt } };
    }

    const created = await prisma.userQuestion.create({
      data: { userId, questionId, solved: true, solvedAt: new Date() },
    });
    return { success: true, data: { solved: created.solved, solvedAt: created.solvedAt } };
  } catch {
    return { success: false, error: "Failed to toggle solved status" };
  }
}

export async function saveNotes(
  questionId: string,
  markdown: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    if (markdown.length > 10000) {
      return { success: false, error: "Notes exceed maximum length of 10,000 characters" };
    }

    await prisma.userQuestion.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      update: { notes: markdown },
      create: { userId: session.user.id, questionId, notes: markdown },
    });

    return { success: true, data: { success: true } };
  } catch {
    return { success: false, error: "Failed to save notes" };
  }
}

export async function getNotes(
  questionId: string
): Promise<ActionResult<{ notes: string }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const userQuestion = await prisma.userQuestion.findUnique({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      select: { notes: true },
    });

    return { success: true, data: { notes: userQuestion?.notes || "" } };
  } catch {
    return { success: false, error: "Failed to fetch notes" };
  }
}
```

- [ ] **Step 2: Create stats server actions**

Create `frontend/actions/stats.ts`:
```typescript
"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getDashboardStats(): Promise<
  ActionResult<{
    totalSolved: number;
    byDifficulty: { EASY: number; MEDIUM: number; HARD: number };
    byCompany: { name: string; solved: number; total: number }[];
    recentActivity: {
      id: string;
      title: string;
      leetcodeUrl: string;
      difficulty: "EASY" | "MEDIUM" | "HARD";
      solvedAt: Date | null;
    }[];
  }>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;

    const totalSolved = await prisma.userQuestion.count({
      where: { userId, solved: true },
    });

    const byDifficulty = await prisma.userQuestion.groupBy({
      by: ["questionId"],
      where: { userId, solved: true },
      _count: true,
    });

    const questionIds = byDifficulty.map((uq) => uq.questionId);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, difficulty: true },
    });

    const difficultyCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (const q of questions) {
      difficultyCounts[q.difficulty]++;
    }

    const userQuestions = await prisma.userQuestion.findMany({
      where: { userId, solved: true },
      include: { question: { select: { companyId: true } } },
    });

    const companySolvedMap = new Map<string, number>();
    for (const uq of userQuestions) {
      const count = companySolvedMap.get(uq.question.companyId) || 0;
      companySolvedMap.set(uq.question.companyId, count + 1);
    }

    const companies = await prisma.company.findMany({
      include: { _count: { select: { questions: { where: { timePeriod: "ALL" } } } } },
    });

    const byCompany = companies
      .map((c) => ({
        name: c.name,
        solved: companySolvedMap.get(c.id) || 0,
        total: c._count.questions,
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.solved - a.solved);

    const recentActivity = await prisma.userQuestion.findMany({
      where: { userId, solved: true },
      orderBy: { solvedAt: "desc" },
      take: 10,
      include: {
        question: { select: { id: true, title: true, leetcodeUrl: true, difficulty: true } },
      },
    });

    return {
      success: true,
      data: {
        totalSolved,
        byDifficulty: difficultyCounts,
        byCompany,
        recentActivity: recentActivity.map((uq) => ({
          id: uq.question.id,
          title: uq.question.title,
          leetcodeUrl: uq.question.leetcodeUrl,
          difficulty: uq.question.difficulty,
          solvedAt: uq.solvedAt,
        })),
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch dashboard stats" };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/actions/
git commit -m "feat: add server actions for questions, notes, and dashboard stats"
```

---

### Task 6: Search API Route

**Files:**
- Create: `frontend/app/api/search/route.ts`

- [ ] **Step 1: Create search API route**

Create `frontend/app/api/search/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  if (!query || query.length < 2) {
    return NextResponse.json({ questions: [], totalPages: 0, currentPage: 1 });
  }

  try {
    const questions = await prisma.$queryRaw`
      SELECT
        q.id,
        q.title,
        q."leetcodeUrl",
        q.difficulty,
        q.topics,
        q.frequency,
        q."acceptanceRate",
        c.name as "companyName",
        c.slug as "companySlug",
        similarity(q.title, ${query}) as score
      FROM "Question" q
      JOIN "Company" c ON q."companyId" = c.id
      WHERE q.title % ${query}
      ORDER BY score DESC, q.frequency DESC
      LIMIT ${pageSize}
      OFFSET ${(page - 1) * pageSize}
    `;

    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "Question" q
      WHERE q.title % ${query}
    `;

    const totalQuestions = Number(countResult[0].count);
    const totalPages = Math.ceil(totalQuestions / pageSize);

    return NextResponse.json({ questions, totalPages, currentPage: page });
  } catch {
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test search endpoint**

```bash
cd frontend && bun run dev
```

Navigate to `http://localhost:3000/api/search?q=two+sum`. Expected: JSON response with matching questions.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/search/
git commit -m "feat: add fuzzy search API route using pg_trgm"
```

---

## Chunk 4: UI Components

### Task 7: Dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install all needed shadcn components**

```bash
cd frontend && bunx shadcn@latest add badge tabs dialog card checkbox textarea select skeleton separator scroll-area tooltip avatar progress
```

- [ ] **Step 2: Install markdown rendering + syntax highlighting**

```bash
cd frontend && bun add react-markdown react-syntax-highlighter
cd frontend && bun add -D @types/react-syntax-highlighter
```

- [ ] **Step 3: Install recharts for dashboard**

```bash
cd frontend && bun add recharts
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ui/ frontend/package.json frontend/bun.lock
git commit -m "feat: install shadcn components, react-markdown, recharts"
```

---

### Task 8: Custom Components

**Files:**
- Create: `frontend/components/difficulty-badge.tsx`
- Create: `frontend/components/company-card.tsx`
- Create: `frontend/components/question-row.tsx`
- Create: `frontend/components/question-detail.tsx`
- Create: `frontend/components/note-editor.tsx`
- Create: `frontend/components/question-table.tsx`
- Create: `frontend/components/time-period-tabs.tsx`
- Create: `frontend/components/search-bar.tsx`
- Create: `frontend/components/search-results.tsx`
- Create: `frontend/components/stats-overview.tsx`
- Create: `frontend/components/company-progress.tsx`
- Create: `frontend/components/recent-activity.tsx`
- Create: `frontend/components/navbar.tsx`

- [ ] **Step 1: Create DifficultyBadge component**

Create `frontend/components/difficulty-badge.tsx`:
```typescript
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const difficultyConfig = {
  EASY: { label: "Easy", className: "bg-green-500/10 text-green-500 hover:bg-green-500/20" },
  MEDIUM: { label: "Medium", className: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20" },
  HARD: { label: "Hard", className: "bg-red-500/10 text-red-500 hover:bg-red-500/20" },
};

interface DifficultyBadgeProps {
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const config = difficultyConfig[difficulty];
  return (
    <Badge variant="secondary" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
```

- [ ] **Step 2: Create CompanyCard component**

Create `frontend/components/company-card.tsx`:
```typescript
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CompanyCardProps {
  name: string;
  slug: string;
  questionCount: number;
  solvedCount?: number;
}

export function CompanyCard({
  name,
  slug,
  questionCount,
  solvedCount = 0,
}: CompanyCardProps) {
  const progress = questionCount > 0 ? (solvedCount / questionCount) * 100 : 0;

  return (
    <Link href={`/companies/${slug}`}>
      <Card className="p-4 transition-colors hover:bg-accent">
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">{name}</h3>
          <p className="text-sm text-muted-foreground">{questionCount} questions</p>
          {solvedCount > 0 && (
            <div className="flex flex-col gap-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {solvedCount}/{questionCount} solved
              </p>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: Create QuestionRow component**

Create `frontend/components/question-row.tsx`:
```typescript
"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { DifficultyBadge } from "./difficulty-badge";
import { QuestionDetail } from "./question-detail";
import { toggleSolved } from "@/actions/questions";

interface QuestionRowProps {
  id: string;
  title: string;
  leetcodeUrl: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topics: string[];
  frequency: number;
  solved: boolean;
  isAuthenticated: boolean;
}

export function QuestionRow({
  id,
  title,
  leetcodeUrl,
  difficulty,
  topics,
  frequency,
  solved: initialSolved,
  isAuthenticated,
}: QuestionRowProps) {
  const [solved, setSolved] = useState(initialSolved);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const result = await toggleSolved(id);
      if (result.success) {
        setSolved(result.data.solved);
      }
    } catch {
      // Silently fail
    }
    setLoading(false);
  }

  return (
    <div className="border-b">
      <div
        className="flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-accent/50"
        onClick={() => setExpanded(!expanded)}
      >
        {isAuthenticated && (
          <Checkbox
            checked={solved}
            onCheckedChange={handleToggle}
            disabled={loading}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <a
            href={leetcodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {title}
          </a>
          <DifficultyBadge difficulty={difficulty} />
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {topics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {topic}
            </span>
          ))}
          {topics.length > 3 && (
            <span className="text-xs text-muted-foreground">+{topics.length - 3}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{frequency.toFixed(1)}%</span>
      </div>
      {expanded && <QuestionDetail questionId={id} isAuthenticated={isAuthenticated} />}
    </div>
  );
}
```

- [ ] **Step 4: Create QuestionDetail component**

Create `frontend/components/question-detail.tsx`:
```typescript
"use client";

import { useState, useEffect } from "react";
import { NoteEditor } from "./note-editor";
import { getNotes } from "@/actions/questions";

interface QuestionDetailProps {
  questionId: string;
  isAuthenticated: boolean;
}

export function QuestionDetail({ questionId, isAuthenticated }: QuestionDetailProps) {
  const [notes, setNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    getNotes(questionId)
      .then((result) => {
        if (result.success) {
          setNotes(result.data.notes);
        } else {
          setNotes("");
        }
      })
      .catch(() => setNotes(""))
      .finally(() => setLoading(false));
  }, [questionId, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="px-4 py-3 text-sm text-muted-foreground">
        Sign in to write notes and track progress.
      </div>
    );
  }

  if (loading) {
    return <div className="px-4 py-3 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="px-4 py-3">
      <NoteEditor questionId={questionId} initialNotes={notes || ""} />
    </div>
  );
}
```

- [ ] **Step 5: Create NoteEditor component with debounced auto-save**

Create `frontend/components/note-editor.tsx`:
```typescript
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveNotes } from "@/actions/questions";
import ReactMarkdown from "react-markdown";

interface NoteEditorProps {
  questionId: string;
  initialNotes: string;
}

export function NoteEditor({ questionId, initialNotes }: NoteEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<NodeJS.Timeout>();
  const latestNotesRef = useRef(notes);

  // Keep ref in sync
  useEffect(() => {
    latestNotesRef.current = notes;
  }, [notes]);

  const doSave = useCallback(async (value: string) => {
    setStatus("saving");
    try {
      const result = await saveNotes(questionId, value);
      if (result.success) {
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, [questionId]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setNotes(value);

      // Debounce save by 1 second
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        doSave(value);
      }, 1000);
    },
    [doSave]
  );

  // Save on blur (immediate, cancel debounce)
  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSave(latestNotesRef.current);
  }, [doSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setPreview(!preview)}>
          {preview ? "Edit" : "Preview"}
        </Button>
        {status === "saving" && <span className="text-xs text-muted-foreground">Saving...</span>}
        {status === "saved" && <span className="text-xs text-green-500">Saved</span>}
        {status === "error" && (
          <button className="text-xs text-destructive" onClick={() => doSave(notes)}>
            Failed — retry
          </button>
        )}
      </div>
      {preview ? (
        <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border p-4">
          <ReactMarkdown>{notes}</ReactMarkdown>
        </div>
      ) : (
        <Textarea
          value={notes}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Write your notes here (markdown supported)..."
          rows={6}
          maxLength={10000}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create QuestionTable component**

Create `frontend/components/question-table.tsx`:
```typescript
import { QuestionRow } from "./question-row";
import { Skeleton } from "@/components/ui/skeleton";

interface Question {
  id: string;
  title: string;
  leetcodeUrl: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topics: string[];
  frequency: number;
  solved: boolean;
}

interface QuestionTableProps {
  questions: Question[];
  isAuthenticated: boolean;
  loading?: boolean;
}

export function QuestionTable({ questions, isAuthenticated, loading }: QuestionTableProps) {
  if (loading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-muted-foreground">
        No questions for this time period.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {questions.map((q) => (
        <QuestionRow
          key={q.id}
          id={q.id}
          title={q.title}
          leetcodeUrl={q.leetcodeUrl}
          difficulty={q.difficulty}
          topics={q.topics}
          frequency={q.frequency}
          solved={q.solved}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Create TimePeriodTabs component**

Create `frontend/components/time-period-tabs.tsx`:
```typescript
"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimePeriod } from "@prisma/client";

const TABS = [
  { value: "ALL", label: "All" },
  { value: "THIRTY_DAYS", label: "30 Days" },
  { value: "THREE_MONTHS", label: "3 Months" },
  { value: "SIX_MONTHS", label: "6 Months" },
  { value: "MORE_THAN_SIX_MONTHS", label: "6+ Months" },
] as const;

interface TimePeriodTabsProps {
  value: TimePeriod;
  onChange: (value: TimePeriod) => void;
}

export function TimePeriodTabs({ value, onChange }: TimePeriodTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TimePeriod)}>
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
```

- [ ] **Step 8: Create SearchBar component (300ms debounce)**

Create `frontend/components/search-bar.tsx`:
```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
}

export function SearchBar({ className, placeholder = "Search questions..." }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (query.length < 2) return;

    debounceRef.current = setTimeout(() => {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, router]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && query.length >= 2) {
      clearTimeout(debounceRef.current);
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <Input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
    />
  );
}
```

- [ ] **Step 9: Create SearchResults component**

Create `frontend/components/search-results.tsx`:
```typescript
import { DifficultyBadge } from "./difficulty-badge";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResult {
  id: string;
  title: string;
  leetcodeUrl: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  companyName: string;
  companySlug: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  loading?: boolean;
}

export function SearchResults({ results, query, loading }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-md border p-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-muted-foreground">
        No results found for &quot;{query}&quot;
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {results.map((r) => (
        <a
          key={r.id}
          href={r.leetcodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-md border p-4 hover:bg-accent"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="truncate font-medium">{r.title}</span>
            <DifficultyBadge difficulty={r.difficulty} />
          </div>
          <span className="text-sm text-muted-foreground">{r.companyName}</span>
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 10: Create StatsOverview component**

Create `frontend/components/stats-overview.tsx`:
```typescript
import { Card } from "@/components/ui/card";

interface StatsOverviewProps {
  totalSolved: number;
  byDifficulty: { EASY: number; MEDIUM: number; HARD: number };
}

export function StatsOverview({ totalSolved, byDifficulty }: StatsOverviewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Total Solved</p>
        <p className="text-3xl font-bold">{totalSolved}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-green-500">Easy</p>
        <p className="text-3xl font-bold">{byDifficulty.EASY}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-yellow-500">Medium</p>
        <p className="text-3xl font-bold">{byDifficulty.MEDIUM}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-red-500">Hard</p>
        <p className="text-3xl font-bold">{byDifficulty.HARD}</p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 11: Create CompanyProgress component**

Create `frontend/components/company-progress.tsx`:
```typescript
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CompanyProgressProps {
  companies: { name: string; solved: number; total: number }[];
}

export function CompanyProgress({ companies }: CompanyProgressProps) {
  const withProgress = companies.filter((c) => c.solved > 0 || c.total > 0);

  if (withProgress.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-muted-foreground">Solve some problems to track your progress.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {withProgress.map((c) => {
        const progress = c.total > 0 ? (c.solved / c.total) * 100 : 0;
        return (
          <Card key={c.name} className="p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{c.name}</h3>
                <span className="text-sm text-muted-foreground">
                  {c.solved}/{c.total}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 12: Create RecentActivity component**

Create `frontend/components/recent-activity.tsx`:
```typescript
import { Card } from "@/components/ui/card";
import { DifficultyBadge } from "./difficulty-badge";

interface ActivityItem {
  id: string;
  title: string;
  leetcodeUrl: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  solvedAt: Date | null;
}

interface RecentActivityProps {
  activity: ActivityItem[];
}

export function RecentActivity({ activity }: RecentActivityProps) {
  if (activity.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-muted-foreground">No recent activity.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {activity.map((item) => (
        <a
          key={item.id}
          href={item.leetcodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-md border p-3 hover:bg-accent"
        >
          <span className="flex-1 font-medium">{item.title}</span>
          <DifficultyBadge difficulty={item.difficulty} />
          {item.solvedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(item.solvedAt).toLocaleDateString()}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 13: Create Navbar component**

Create `frontend/components/navbar.tsx`:
```typescript
"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="font-bold">
          LC Tracker
        </Link>
        <Link
          href="/companies"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Companies
        </Link>
        <div className="flex-1">
          <SearchBar className="max-w-md" />
        </div>
        {session?.user ? (
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register</Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 14: Commit all components**

```bash
git add frontend/components/
git commit -m "feat: add all UI components for company cards, questions, notes, search, dashboard"
```

---

## Chunk 5: Pages & Wiring

### Task 9: Main Layout and Landing Page

**Files:**
- Modify: `frontend/app/layout.tsx`
- Create: `frontend/app/(main)/layout.tsx`
- Create: `frontend/app/(main)/page.tsx`
- Delete: `frontend/app/page.tsx` (old scaffold)

- [ ] **Step 1: Update root layout**

Replace `frontend/app/layout.tsx`:
```typescript
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontSans.variable,
        "font-mono",
        jetbrainsMono.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create main layout with Navbar**

Create `frontend/app/(main)/layout.tsx`:
```typescript
import { Navbar } from "@/components/navbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create landing page with SearchBar**

Create `frontend/app/(main)/page.tsx`:
```typescript
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CompanyCard } from "@/components/company-card";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { SearchBar } from "@/components/search-bar";
import { Card } from "@/components/ui/card";

export default async function HomePage() {
  const [companies, totalQuestions, totalCompanies, recentQuestions] =
    await Promise.all([
      prisma.company.findMany({
        include: { _count: { select: { questions: true } } },
        orderBy: { questions: { _count: "desc" } },
        take: 12,
      }),
      prisma.question.count(),
      prisma.company.count(),
      prisma.question.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { company: { select: { name: true, slug: true } } },
      }),
    ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero */}
      <section className="mb-12 flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold">LeetCode Company Tracker</h1>
        <p className="text-lg text-muted-foreground">
          Track {totalQuestions.toLocaleString()} questions across {totalCompanies} companies
        </p>
        <SearchBar className="w-full max-w-lg" />
      </section>

      {/* Stats */}
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold">{totalCompanies}</p>
          <p className="text-sm text-muted-foreground">Companies</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold">{totalQuestions.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Questions</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold">5</p>
          <p className="text-sm text-muted-foreground">Time Periods</p>
        </Card>
      </section>

      {/* Top Companies */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Top Companies</h2>
          <Link href="/companies" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {companies.map((c) => (
            <CompanyCard
              key={c.id}
              name={c.name}
              slug={c.slug}
              questionCount={c._count.questions}
            />
          ))}
        </div>
      </section>

      {/* Recently Added */}
      <section>
        <h2 className="mb-4 text-2xl font-bold">Recently Added</h2>
        <div className="flex flex-col gap-2">
          {recentQuestions.map((q) => (
            <a
              key={q.id}
              href={q.leetcodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-md border p-3 hover:bg-accent"
            >
              <span className="flex-1 font-medium">{q.title}</span>
              <DifficultyBadge difficulty={q.difficulty} />
              <span className="text-sm text-muted-foreground">{q.company.name}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Remove old scaffold page.tsx**

Delete `frontend/app/page.tsx` (the old "Project ready!" scaffold).

- [ ] **Step 5: Commit**

```bash
git add frontend/app/
git commit -m "feat: add main layout with navbar and landing page with search and stats"
```

---

### Task 10: Companies Pages

**Files:**
- Create: `frontend/app/(main)/companies/page.tsx`
- Create: `frontend/app/(main)/companies/[slug]/page.tsx`

- [ ] **Step 1: Create companies list page (with search filter)**

Create `frontend/app/(main)/companies/page.tsx`:
```typescript
import { prisma } from "@/lib/db";
import { CompanyCard } from "@/components/company-card";
import { CompaniesFilter } from "./companies-filter";

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({
    include: { _count: { select: { questions: true } } },
    orderBy: { name: "asc" },
  });

  const filtered = companies.filter((c) => c._count.questions > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">All Companies</h1>
      <CompaniesFilter
        companies={filtered.map((c) => ({
          name: c.name,
          slug: c.slug,
          questionCount: c._count.questions,
        }))}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create CompaniesFilter client component**

Create `frontend/app/(main)/companies/companies-filter.tsx`:
```typescript
"use client";

import { useState } from "react";
import { CompanyCard } from "@/components/company-card";
import { Input } from "@/components/ui/input";

interface CompaniesFilterProps {
  companies: { name: string; slug: string; questionCount: number }[];
}

export function CompaniesFilter({ companies }: CompaniesFilterProps) {
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? companies.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : companies;

  return (
    <>
      <Input
        placeholder="Filter companies..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-6 max-w-md"
      />
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((c) => (
          <CompanyCard
            key={c.slug}
            name={c.name}
            slug={c.slug}
            questionCount={c.questionCount}
          />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create company detail page (with URL param pagination)**

Create `frontend/app/(main)/companies/[slug]/page.tsx`:
```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getCompanyQuestions } from "@/actions/questions";
import { QuestionTable } from "@/components/question-table";
import { TimePeriodTabs } from "@/components/time-period-tabs";
import { Button } from "@/components/ui/button";
import { TimePeriod } from "@prisma/client";

export default function CompanyDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { data: session } = useSession();

  const initialPeriod = (searchParams.get("period") as TimePeriod) || "ALL";
  const initialPage = parseInt(searchParams.get("page") || "1");

  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialPeriod);
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<{
    questions: any[];
    totalPages: number;
    currentPage: number;
  }>({ questions: [], totalPages: 0, currentPage: 1 });
  const [loading, setLoading] = useState(true);

  // Sync URL params
  const updateUrl = useCallback(
    (period: TimePeriod, p: number) => {
      const params = new URLSearchParams();
      if (period !== "ALL") params.set("period", period);
      if (p !== 1) params.set("page", String(p));
      const qs = params.toString();
      router.replace(`/companies/${slug}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, slug]
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    updateUrl(timePeriod, 1);
    getCompanyQuestions(slug, timePeriod, 1)
      .then((result) => {
        if (result.success) setData(result.data);
      })
      .finally(() => setLoading(false));
  }, [slug, timePeriod, updateUrl]);

  useEffect(() => {
    if (page === 1) return;
    setLoading(true);
    updateUrl(timePeriod, page);
    getCompanyQuestions(slug, timePeriod, page)
      .then((result) => {
        if (result.success) setData(result.data);
      })
      .finally(() => setLoading(false));
  }, [slug, timePeriod, page, updateUrl]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold capitalize">
        {slug.replace(/-/g, " ")}
      </h1>

      <div className="mb-6">
        <TimePeriodTabs value={timePeriod} onChange={setTimePeriod} />
      </div>

      <QuestionTable
        questions={data.questions}
        isAuthenticated={!!session?.user}
        loading={loading}
      />

      {data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.currentPage} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add "frontend/app/(main)/companies/"
git commit -m "feat: add companies list with filter and detail page with URL-based pagination"
```

---

### Task 11: Search and Dashboard Pages

**Files:**
- Create: `frontend/app/(main)/search/page.tsx`
- Create: `frontend/app/(main)/dashboard/page.tsx`

- [ ] **Step 1: Create search page**

Create `frontend/app/(main)/search/page.tsx`:
```typescript
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SearchResults } from "@/components/search-results";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) return;

    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data.questions || []);
        setTotalPages(data.totalPages || 0);
      })
      .catch(() => {
        setResults([]);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  }, [query, page]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Search</h1>
      <SearchBar className="mb-6" />

      {query.length < 2 ? (
        <p className="text-center text-muted-foreground">
          Type at least 2 characters to search.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Results for &quot;{query}&quot;
          </p>
          <SearchResults results={results} query={query} loading={loading} />

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create dashboard page**

Create `frontend/app/(main)/dashboard/page.tsx`:
```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDashboardStats } from "@/actions/stats";
import { StatsOverview } from "@/components/stats-overview";
import { CompanyProgress } from "@/components/company-progress";
import { RecentActivity } from "@/components/recent-activity";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const result = await getDashboardStats();

  if (!result.success) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-destructive">Failed to load dashboard stats.</p>
      </div>
    );
  }

  const stats = result.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>
      <div className="flex flex-col gap-8">
        <StatsOverview totalSolved={stats.totalSolved} byDifficulty={stats.byDifficulty} />
        <section>
          <h2 className="mb-4 text-xl font-bold">Recent Activity</h2>
          <RecentActivity activity={stats.recentActivity} />
        </section>
        <section>
          <h2 className="mb-4 text-xl font-bold">Company Progress</h2>
          <CompanyProgress companies={stats.byCompany} />
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/(main)/search/" "frontend/app/(main)/dashboard/"
git commit -m "feat: add search and dashboard pages"
```

---

## Chunk 6: Polish

### Task 12: React Bits Animations

- [ ] **Step 1: Install React Bits components**

React Bits components are installed via shadcn CLI or copied from the docs. Try:
```bash
cd frontend && bunx shadcn@latest add @react-bits/BlurText-TS-TW
```

If not available via CLI, visit https://reactbits.dev and copy the TypeScript + Tailwind variant of `BlurText` into `frontend/components/react-bits/blur-text.tsx`.

- [ ] **Step 2: Add BlurText to landing page hero**

Update `frontend/app/(main)/page.tsx` to replace the `<h1>` with BlurText:
```tsx
import { BlurText } from "@/components/react-bits/blur-text";

// In the hero section:
<BlurText
  text="LeetCode Company Tracker"
  delay={150}
  animateBy="words"
  className="text-4xl font-bold"
/>
```

If BlurText isn't working, fall back to a plain `<h1>` — animations are nice-to-have, not blocking.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/react-bits/ "frontend/app/(main)/page.tsx"
git commit -m "feat: add React Bits BlurText animation to landing page"
```

---

### Task 13: Final Cleanup and Verification

- [ ] **Step 1: Run typecheck**

```bash
cd frontend && bun run typecheck
```

Expected: No TypeScript errors. If the script doesn't exist, run `bunx tsc --noEmit`.

- [ ] **Step 2: Run lint**

```bash
cd frontend && bun run lint
```

Expected: No lint errors.

- [ ] **Step 3: Run build**

```bash
cd frontend && bun run build
```

Expected: Build succeeds.

- [ ] **Step 4: Test full flow manually**

1. Visit `/` — see landing page with stats and search bar
2. Use search bar — navigates to `/search?q=...`
3. Click "Companies" — see companies grid with filter
4. Click a company — see questions list with time period tabs
5. Toggle time period — questions update, URL updates
6. Register an account at `/register`
7. Toggle solved on a question
8. Write notes on a question, switch to preview
9. Visit `/dashboard` — see stats, recent activity, company progress
10. Sign out — verify redirect

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```
