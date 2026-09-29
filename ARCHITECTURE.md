# Todo App — Architecture

A full-stack Todo app built to learn **Next.js** (frontend) and **NestJS** (backend).
This file is the map: what the app looks like when finished, and the order we build it in.

---

## 1. System overview

```
┌──────────────┐   HTTP + JSON    ┌──────────────────┐   Prisma    ┌──────────────┐
│   Browser    │ ───────────────► │  NestJS API      │ ──────────► │  Database    │
│  Next.js app │ ◄─────────────── │  localhost:4000  │ ◄────────── │  SQLite      │
│  :3000       │  Bearer token    │                  │             │  (→ Postgres)│
└──────────────┘                  └──────────────────┘             └──────────────┘
```

| Part | Tech | Job |
|---|---|---|
| Frontend | Next.js (App Router) + React + Tailwind | Pages, forms, show data |
| Backend | NestJS (Express) | Rules, validation, security, data access |
| Database | SQLite via Prisma (Postgres later) | Store users and todos |

**Golden rule:** the frontend is for the user's *experience*; the backend is for *security*.
Anything the frontend checks, the backend must check again.

---

## 2. Backend architecture

### 2.1 Layers

```
Request
  │
  ▼
Guards        → who are you? are you allowed?     (401 / 403)
  │
  ▼
Pipes         → is the data valid? convert types  (400)
  │
  ▼
Controller    → HTTP only: route → call service → return result
  │
  ▼
Service       → business logic (the "rules")
  │
  ▼
PrismaService → talks to the database
  │
  ▼
Exception Filter (on any error) → turns errors into clean JSON responses
```

| Layer | Should | Should NOT |
|---|---|---|
| Controller | Read params/body/user, call a service | Contain logic or DB queries |
| Service | Business rules, call Prisma | Know about HTTP (req/res) |
| PrismaService | One shared DB connection | Be created with `new` anywhere |
| DTO | Describe + validate input | Be reused for output |

### 2.2 Folder structure (target)

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                    # test users + todos
└── src/
    ├── main.ts                    # bootstrap: dotenv, CORS, global pipes
    ├── app.module.ts              # wires all modules together
    ├── generated/prisma/          # generated — don't edit
    │
    ├── prisma/                    # DB access (global)
    │   ├── prisma.module.ts
    │   └── prisma.service.ts
    │
    ├── auth/                      # login / register / tokens
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── dto/auth.dto.ts
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts  # 401 if no/invalid token
    │   │   └── roles.guard.ts     # 403 if wrong role
    │   └── decorators/
    │       ├── public.decorator.ts        # @Public()
    │       ├── roles.decorator.ts         # @Roles('ADMIN')
    │       └── current-user.decorator.ts  # @CurrentUser()
    │
    ├── users/                     # user data
    │   ├── users.module.ts
    │   └── users.service.ts
    │
    ├── todos/                     # the feature
    │   ├── todos.module.ts
    │   ├── todos.controller.ts
    │   ├── todos.service.ts
    │   └── dto/
    │       ├── create-todo.dto.ts
    │       ├── update-todo.dto.ts
    │       └── query-todos.dto.ts # filters, pagination
    │
    └── common/                    # shared, not tied to a feature
        └── filters/
            └── prisma-exception.filter.ts  # P2025 → 404, P2002 → 409
```

**One feature = one folder = one module.** A new feature (e.g. `tags`) gets its own folder with the same shape.

### 2.3 Data model

```
┌──────────────────────┐           ┌──────────────────────┐
│ User                 │ 1       * │ Todo                 │
├──────────────────────┤───────────├──────────────────────┤
│ id          Int  PK  │           │ id         Int  PK   │
│ username    String U │           │ title      String    │
│ passwordHash String  │           │ done       Boolean   │
│ role        Role     │           │ createdAt  DateTime  │
│ createdAt   DateTime │           │ userId     Int  FK   │
└──────────────────────┘           └──────────────────────┘
 Role = USER | ADMIN               onDelete: Cascade (delete user → delete their todos)
```

Later: `dueDate`, `priority` on Todo; a `Tag` model (many-to-many with Todo).

### 2.4 API

| Method | Route | Auth | Role | Purpose |
|---|---|---|---|---|
| POST | `/auth/register` | Public | — | Create account |
| POST | `/auth/login` | Public | — | Get `access_token` |
| GET | `/auth/me` | ✅ | any | Who am I? |
| GET | `/todos` | ✅ | any | **My** todos |
| POST | `/todos` | ✅ | any | Create a todo (owned by me) |
| PATCH | `/todos/:id` | ✅ | any | Update **my** todo (else 404) |
| DELETE | `/todos/:id` | ✅ | any | Delete **my** todo (else 404) |
| GET | `/todos/all` | ✅ | ADMIN | Everyone's todos (else 403) |

### 2.5 Status codes

| Code | Meaning | Where it comes from |
|---|---|---|
| 200 / 201 / 204 | OK / Created / Deleted | Controller |
| 400 | Bad input | `ValidationPipe`, `ParseIntPipe` |
| 401 | Not logged in / bad token / wrong password | `JwtAuthGuard`, `AuthService` |
| 403 | Logged in but wrong role | `RolesGuard` |
| 404 | Not found **or not yours** | Service / exception filter |
| 409 | Duplicate (username taken) | `AuthService` / exception filter |
| 500 | Our bug | Anything unhandled |

---

## 3. Authentication & authorization

### 3.1 Login flow

```
1. POST /auth/login {username, password}
2. AuthService: find user → bcrypt.compare → sign JWT {sub, username, role} (1h)
3. ← { access_token }
4. Frontend stores token
5. Every request: Authorization: Bearer <token>
6. JwtAuthGuard verifies signature + expiry → request.user = {id, username, role}
```

### 3.2 Two kinds of authorization

| Kind | Question | How | Failure |
|---|---|---|---|
| **Ownership** | Is this *your* todo? | Every query has `where: { userId }` | 404 |
| **Role** | Are you an admin? | `@Roles('ADMIN')` + `RolesGuard` | 403 |

### 3.3 Secure by default
`JwtAuthGuard` is registered **globally** → every route is locked.
Only routes marked `@Public()` (login, register) are open.

---

## 4. Frontend architecture

### 4.1 Pages (App Router)

```
frontend/app/
├── layout.tsx            # shell: <AuthProvider>, navbar
├── page.tsx              # redirect → /todos or /login
├── login/page.tsx        # login form
├── register/page.tsx     # sign-up form
├── todos/page.tsx        # my todos (protected)
└── admin/page.tsx        # all todos (ADMIN only)
```

### 4.2 Supporting code

```
frontend/
├── lib/
│   ├── api.ts            # fetch wrapper: base URL, token header, 401 → /login
│   └── types.ts          # Todo, User types (match the API)
├── context/
│   └── auth-context.tsx  # user + token + login() / logout(), shared app-wide
└── components/
    ├── todo-form.tsx
    ├── todo-item.tsx
    ├── todo-list.tsx
    └── navbar.tsx        # shows username, admin link, logout
```

| Piece | Why |
|---|---|
| `lib/api.ts` | One place for the URL, headers, and error handling — pages never call `fetch` directly |
| `auth-context` | Any component can ask "who's logged in?" without passing props down |
| `components/` | Pages stay short; each component does one thing |
| `NEXT_PUBLIC_API_URL` in `.env.local` | No hardcoded `http://localhost:4000` |

### 4.3 Data flow on a page

```
todos/page.tsx
  ├─ useAuth() → no user? → redirect /login
  ├─ useEffect → api('/todos') → setTodos
  ├─ <TodoForm onAdd={...} />
  └─ <TodoList todos={todos} onToggle={...} onDelete={...} />
                    └─ <TodoItem /> × n
```

---

## 5. Configuration

| File | Keys | Committed? |
|---|---|---|
| `backend/.env` | `DATABASE_URL`, `JWT_SECRET` | ❌ |
| `backend/.env.example` | Same keys, fake values | ✅ (so others know what's needed) |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL` | ❌ |

---

## 6. Conventions

- Imports inside `backend/src` end in `.js` and never contain `/src/`.
- One DTO per action (`CreateTodoDto`, `UpdateTodoDto`), always with validation decorators.
- Never return `passwordHash` — select only safe fields.
- Always `return` / `await` async calls.
- Never mutate React state — create new arrays/objects (`[...]`, `.map`, `.filter`).
- Controllers stay thin; logic lives in services.
- After changing `schema.prisma`: `migrate dev` → `generate`.
- Commit after each working step.

---

## 7. Roadmap (learn → build)

| Phase | Build | You learn | Status |
|---|---|---|---|
| **1. CRUD** | Todos API + page | Modules, controllers, services, DI, DTOs, pipes, `useState`, `useEffect`, `fetch` | ✅ Done |
| **2. Database** | SQLite + Prisma | Schema, migrations, ORM, async | ✅ Done |
| **3. Auth** | A1 users/bcrypt ✅ · A2 JWT · A3 guard · A4 ownership · A5 roles · A6 frontend login | Hashing, tokens, guards, decorators, relations | 🔄 In progress |
| **4. Frontend structure** | `lib/api.ts`, auth context, components, pages from §4 | Components & props, context, routing, env vars | ⏳ |
| **5. Quality** | Exception filter, `@nestjs/config` validation, seed script, `.env.example` | Filters, config, DX | ⏳ |
| **6. Testing** | Service unit tests, e2e tests for auth + todos | Vitest, mocking, supertest | ⏳ |
| **7. Features** | Due dates, priority, filter/search, pagination, tags | Query params, many-to-many relations | ⏳ |
| **8. Production** | Postgres, Docker, httpOnly cookies, rate-limit login, deploy | Deployment, security hardening | ⏳ |

Each phase leaves the app **working**. Commit at the end of every step.
