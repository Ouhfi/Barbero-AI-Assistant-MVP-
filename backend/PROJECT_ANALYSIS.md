# 🧔 Barbero MVP — Backend Code Analysis Report

> **Reviewer:** Senior Software Architect (AI-Assisted)
> **Date:** 2026-10-13
> **Scope:** Read-only static analysis — no files were modified.
> **Stack:** Node.js · Express 5 · Sequelize 6 · PostgreSQL 17 · Socket.io 4 · Zod 4 · Expo React Native (upcoming)

---

## Table of Contents

1. [📂 Architecture & Directory Structure Overview](#1--architecture--directory-structure-overview)
2. [🛡️ Security & Validation Audit](#2--security--validation-audit)
3. [⚡ Performance & Real-Time Reliability](#3--performance--real-time-reliability)
4. [📱 Frontend Readiness](#4--frontend-readiness-expo--react-native)
5. [🚀 Actionable Recommendations](#5--actionable-recommendations)

---

## 1. 📂 Architecture & Directory Structure Overview

### 1.1 Directory Map

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Sequelize instance configuration
│   ├── controllers/
│   │   ├── authController.js    # register / login / me
│   │   ├── areaController.js    # GetArea (list all areas)
│   │   └── orderController.js   # CRUD + state machine for orders
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verification (HTTP)
│   │   ├── socketAuth.js        # JWT verification (Socket.io)
│   │   ├── validate.js          # Zod schema runner
│   │   ├── authSchemas.js       # Zod: registerSchema, loginSchema
│   │   ├── orderSchemas.js      # Zod: createOrderSchema
│   │   ├── asyncHandler.js      # Promise catch wrapper
│   │   └── errorMiddleware.js   # Global notFound + errorHandler
│   ├── models/
│   │   ├── User.js              # id, email, password, role, area_id
│   │   ├── Area.js              # id, name
│   │   ├── Order.js             # id, customer_id, barber_id, area_id, status
│   │   └── associations/
│   │       └── index.js         # ⚠️ Defines all model relations — NEVER IMPORTED
│   ├── routes/
│   │   ├── authRoutes.js        # /api/auth/*
│   │   ├── areaRoutes.js        # /api/areas/*
│   │   └── orderRoutes.js       # /api/orders/*
│   ├── seeders/
│   │   └── areaSeeder.js        # Seeds Agadir neighbourhoods on boot
│   ├── sockets/
│   │   └── socketHandler.js     # join_area + disconnect events
│   └── server.js                # App entry point
├── .env
├── docker-compose.yml
└── package.json
```

### 1.2 Separation of Concerns Assessment

The folder layout follows a sensible MVC-inspired structure and is appropriate for an MVP. However, there are several critical structural disconnections that prevent the server from starting correctly.

---

### 1.3 Critical Structural Bugs (Server Will Not Boot)

#### ❌ BUG 1 — Invalid Import Paths (Fatal ERR_MODULE_NOT_FOUND)

`authRoutes.js` (line 5–8) imports from a path that does not exist:

```javascript
// ❌ WRONG — src/validators/ directory does not exist
import { registerSchema, loginSchema } from "../validators/authSchemas.js";
```

`orderRoutes.js` (line 13) has the same problem:

```javascript
// ❌ WRONG
import { createOrderSchema } from "../validators/orderSchemas.js";
```

Both schema files physically live in `src/middleware/`, not `src/validators/`. Node.js ES Modules will immediately throw `ERR_MODULE_NOT_FOUND` and the server will never start.

**Fix:** Either correct the import paths to `../middleware/authSchemas.js` / `../middleware/orderSchemas.js`, or create a dedicated `src/validators/` directory and move the schema files there.

---

#### ❌ BUG 2 — Zod Schema Called as a Function (TypeError)

`orderRoutes.js` line 19:

```javascript
// ❌ WRONG — createOrderSchema is a Zod schema object, not a higher-order function
router.post("/", authenticate, createOrderSchema(validate), asyncHandler(createOrder));

// ✅ CORRECT — validate wraps the schema
router.post("/", authenticate, validate(createOrderSchema), asyncHandler(createOrder));
```

Even if the import path were fixed, this invocation would immediately throw `TypeError: createOrderSchema is not a function` and crash the process.

---

#### ❌ BUG 3 — Sequelize Associations File is Never Imported

`src/models/associations/index.js` defines all relational mappings:

```javascript
User.hasMany(Order, { foreignKey: "customer_id", as: "customerOrders" });
Order.belongsTo(User, { foreignKey: "customer_id", as: "customer" });
User.hasMany(Order, { foreignKey: "barber_id",   as: "barberOrders" });
Order.belongsTo(User, { foreignKey: "barber_id",  as: "barber" });
Area.hasMany(Order,  { foreignKey: "area_id",    as: "orders" });
Order.belongsTo(Area, { foreignKey: "area_id",   as: "area" });
```

**This file is imported nowhere in the codebase.** Grepping all `src/` files for `associations` returns zero results. As a result:

- Eager loading (`include: [{ model: User, as: "customer" }]`) will throw `EagerLoadingError` at runtime.
- Frontend cannot receive enriched payloads (e.g., customer name alongside an order).
- The only active association is the `User.belongsTo(Area)` call at the bottom of `User.js`, which partially works but is inconsistent.

---

#### ❌ BUG 4 — Health Check Route is Unreachable

In `server.js`, the route order is:

```javascript
app.use("/api/areas",  areaRoutes);
app.use("/api/auth",   authRoutes);
app.use("/api/orders", orderRoutes);
app.use(notFound);         // ← catches ALL unmatched routes
app.use(errorHandler);     // ← global error handler

// ❌ This route is registered AFTER notFound — it will always return 404
app.get("/", (req, res) => res.status(200).json({ message: "Server started successfully" }));
```

Any `GET /` request hits `notFound` and returns HTTP 404 before reaching the handler.

---

#### ⚠️ BUG 5 — getMyOrderId Uses findAll Instead of findOne

`orderController.js` lines 77–100:

```javascript
// ❌ findAll never returns null — an empty array [] is truthy
const orders = await Order.findAll({ where: { id, customer_id: req.user.id } });

if (!orders) { // ← This condition will NEVER be true
  return res.status(404).json({ message: "order is not found" });
}
```

**Consequences:**
- When an order does not exist, this endpoint returns **HTTP 200** with `{ orders: [] }` — a silent 404.
- The frontend has no reliable way to distinguish "order not found" from "empty list."

---

### 1.4 Architecture-Level Concerns

| Concern | Detail |
|---|---|
| **No Service Layer** | Business logic (role checks, state transitions, socket emissions) is embedded directly in controllers. Business operations cannot be reused from WebSocket handlers or cron jobs without copy-pasting controller code. |
| **Inconsistent asyncHandler Usage** | `asyncHandler` is imported but applied to only 1 of 7 routes in `orderRoutes.js`. All other routes rely on manual `try/catch`, resulting in divergent error handling paths. |
| **Dead Import in authController.js** | Line 6: `import E from "dotenv"` — `E` is never used. A side-effectful `import "dotenv/config"` already runs on line 4. |
| **`or` Imported but Unused** | `orderController.js` line 1: `import { or } from "sequelize"` — never used anywhere in the file. |

---

## 2. 🛡️ Security & Validation Audit

### 2.1 Vulnerability Summary Table

| Severity | Category | File | Description |
|---|---|---|---|
| 🔴 CRITICAL | Zod Schema Strips Required Fields | `middleware/authSchemas.js` | `registerSchema` excludes `role` and `area_id`. Zod strips them. Barber registration is broken by design. |
| 🔴 CRITICAL | Missing Package Declaration | `package.json` | `jsonwebtoken` is used in 3 files but not listed in `dependencies`. Fresh installs crash. |
| 🟠 HIGH | No Rate Limiting | `routes/authRoutes.js` | `/login` and `/register` have no throttling. Brute-force attacks are unrestricted. |
| 🟠 HIGH | No HTTP CORS or Security Headers | `server.js` | No `cors()` middleware for REST endpoints. No `helmet` for security headers. |
| 🟡 MEDIUM | Password Hash Exposure Risk | `models/User.js` | No `defaultScope` excluding `password`. Any unguarded `User.findAll()` leaks password hashes. |
| 🟡 MEDIUM | Weak JWT Secret in .env | `.env` | `JWT_SECRET=barbero_super_secret_key_change_me` — default placeholder, not rotated. |
| 🟡 MEDIUM | Route Param Injection | All routes with `/:id` | `req.params.id` is passed directly without type coercion. If `id = "abc"`, a type mismatch is sent to PostgreSQL. |

---

### 2.2 JWT Implementation (HTTP) — authMiddleware.js

**What works correctly:**
- Standard Bearer token extraction from the `Authorization` header.
- `jwt.verify()` properly validates signature and expiration.
- `req.user = decoded` makes claims available downstream.

**Issues:**

```javascript
const token = authHeader.split(" ")[1];
```

- No guard for malformed headers. If `Authorization: Bearer` (no token), `token` is `undefined`.
- No check that the `Bearer` scheme is present.

**Token Claims Design Flaw:**

The JWT payload contains only `{ id, role }`. Because `area_id` is not embedded, every barber-facing controller executes an extra database round-trip:

```javascript
// Repeated in acceptOrder, completeOrder, getAvailableOrders, cancelOrder
const barber = await User.findByPk(req.user.id);
```

This adds 4 unnecessary queries per barber action request.

**Other concerns:**
- No token refresh mechanism. After 7 days, users are silently logged out.
- No token revocation on password change or logout.

---

### 2.3 Socket.io Authentication — socketAuth.js

**What works correctly:**
- Token passed via `socket.handshake.auth.token` (the Socket.io standard).
- DB lookup validates user still exists.
- `socket.data.user` is scoped correctly and used safely in `socketHandler.js`.

**Issues:**

On mobile apps (Expo), network transitions (WiFi → 4G) trigger Socket.io reconnections. Each reconnect fires this middleware again, causing a database hit per reconnect per user.

**Recommendation:** If the JWT payload includes `area_id`, the DB query in `socketAuth` can be eliminated entirely.

---

### 2.4 Zod Validation — authSchemas.js / orderSchemas.js

#### Critical Issue — registerSchema is Incomplete

```javascript
export const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
  // ❌ role and area_id are missing — Zod strips them from req.body
});
```

After `req.body = result.data`, the body contains only `{ email, password }`. The controller's `userRole` is always `"CUSTOMER"`. **It is impossible to register a BARBER through the API.**

#### Route Params Not Validated

All `/:id` routes have no Zod validation on `req.params`. Types are not coerced, making the system vulnerable to type confusion bugs (e.g. `id = "abc"` results in `NaN` after `Number(id)`).

---

## 3. ⚡ Performance & Real-Time Reliability

### 3.1 Real-Time Event Lifecycle Audit

The current system emits exactly **one** WebSocket event:

```javascript
// orderController.js — createOrder only
io.to(`area_${order.area_id}`).emit("new_order", { ... });
```

The following state transitions happen **silently** — no socket events, no notifications:

| Action | HTTP Route | Socket Event Emitted? | Impact |
|---|---|---|---|
| Customer creates order | `POST /api/orders` | ✅ `new_order` → area barbers | Works |
| Barber accepts order | `PATCH /:id/accept` | ❌ None | Other barbers still see the order. Customer gets no notification. |
| Barber completes order | `PATCH /:id/complete` | ❌ None | Customer gets no notification. |
| Customer/Barber cancels | `PATCH /:id/cancel` | ❌ None | Barbers don't know to remove the order from their feed. |

The real-time system is a **one-way pipe** — it announces new orders but never propagates state changes.

---

### 3.2 Customer Has No Socket Room

There is no mechanism for the customer to receive real-time events. The `socketHandler.js` only implements a `join_area` event for barbers. Customer-facing real-time features cannot function without a `user_${userId}` personal room.

```javascript
// What's missing in socketHandler.js
socket.join(`user_${user.id}`); // ← every user should join this on connection
```

---

### 3.3 Socket.io Scaling — In-Memory Adapter

The default Socket.io adapter stores room memberships in-memory. As soon as the app runs in more than one process or container, broadcasts emitted on process A will never reach barbers connected to process B. The `@socket.io/redis-adapter` package resolves this.

For the MVP, this is acceptable — document it for pre-scale action.

---

### 3.4 Database — Missing Indexes

The `orders` table is queried most frequently using these patterns, none of which have indexes:

```sql
-- getAvailableOrders
WHERE area_id = ? AND status = 'PENDING' AND barber_id IS NULL

-- getMyOrder
WHERE customer_id = ? ORDER BY createdAt DESC

-- acceptOrder / completeOrder / cancelOrder
WHERE id = ? AND barber_id = ? AND status = ?
```

**Recommended indexes to add to Order.js:**

```javascript
indexes: [
  { fields: ["area_id", "status", "barber_id"] }, // covers getAvailableOrders
  { fields: ["customer_id", "createdAt"] },        // covers getMyOrder
  { fields: ["barber_id", "status"] },             // covers barber-scoped queries
]
```

---

### 3.5 Database — Connection Pool Not Configured

`database.js` uses Sequelize defaults (max 5 connections). A Socket.io server handling high-frequency reconnects (mobile clients) combined with per-request DB queries can exhaust this pool rapidly.

```javascript
// Recommended addition in database.js
pool: { max: 20, min: 2, acquire: 30000, idle: 10000 }
```

---

### 3.6 Runtime sequelize.sync() and Seeder on Every Boot

```javascript
// server.js
await sequelize.sync();   // DDL changes on every boot — risky in multi-process production
await seedAreas();        // 17 DB round-trips on every restart
```

**Recommendation:** Replace `sync()` with Sequelize migrations. Run the seeder as a one-time script (`npm run seed`), not on every startup.

---

### 3.7 Unbounded Queries (Missing Pagination)

Both `getMyOrder` and `getAvailableOrders` return all matching rows without `LIMIT` or `OFFSET`. A customer with hundreds of past orders causes large memory allocation on the server and bloated payloads on the mobile client.

---

## 4. 📱 Frontend Readiness (Expo / React Native)

### 4.1 API Response Contract Inconsistencies

| Endpoint | Response Shape | Issue |
|---|---|---|
| `GET /api/areas` | `[ { id, name }, ... ]` | Returns a raw array. Every other endpoint returns an object. |
| `GET /api/orders` | `{ message, orders: [...] }` | Error response has `error: error.Message` (capital M) — returns `undefined`. |
| `GET /api/orders/:id` | `{ orders: [...] }` | ❌ Uses `findAll`, returns an array for a single resource. Returns HTTP 200 `{ orders: [] }` when not found (silent 404). |
| `PATCH /api/orders/:id/accept` | `{ message: "order accpted successfuly" }` | ❌ Does not return the updated order. Typo in message. Frontend must make a second HTTP request to refresh state. |
| `PATCH /api/orders/:id/complete` | `{ message, order: {...} }` | Returns `order` object here, but not in `accept`. Inconsistent. |
| `PATCH /api/orders/:id/cancel` | `{ message, order: {...} }` | Consistent with `complete` but inconsistent with `accept`. |

**Recommendation:** Adopt a single response envelope:

```json
{ "success": true, "message": "Human-readable message", "data": { ... } }
```

---

### 4.2 Missing Data for Mobile Screens

**Barber Dashboard / Available Orders** — `GET /api/orders/available` returns `customer_id` (integer) but not customer name or phone number. Area name is absent — only `area_id` integer is returned.

**Customer Order Tracking** — No `GET /api/orders/active` endpoint for app launch. No real-time events for status updates.

---

### 4.3 Missing User Profile Fields

The `User` model only contains `{ id, email, password, role, area_id }`. A barbershop service requires at minimum:

| Field | Why It's Needed |
|---|---|
| `name` | Display name for barber cards and order receipts |
| `phone_number` | Customer-barber coordination |
| `is_available` | Toggle for barbers to go off-duty without logging out |
| `profile_picture_url` | Visual identity for barber cards in the customer feed |

---

### 4.4 Missing Endpoints for Mobile App Flows

| Screen | Needed Endpoint | Status |
|---|---|---|
| App launch / resume | `GET /api/orders/active` | ❌ Missing |
| Customer home | `GET /api/barbers?area_id=X` | ❌ Missing |
| Order history | `GET /api/orders?page=1&limit=20` | ❌ No pagination |
| Profile management | `GET/PATCH /api/users/me` | ❌ Missing |
| Customer order tracking | WebSocket `order_accepted`, `order_completed` | ❌ Missing |
| Barber feed | WebSocket `order_taken`, `order_canceled` | ❌ Missing |

---

### 4.5 Socket.io Client Integration Checklist for Expo

```javascript
// Expected client-side integration (what Expo will need)
const socket = io("http://YOUR_SERVER", {
  auth: { token: jwtToken },        // ✅ socketAuth supports this
  transports: ["websocket"],        // Recommended for React Native
  reconnectionAttempts: 5,
});

// Barber flow
socket.emit("join_area", areaId, (res) => { ... }); // ✅ Implemented
socket.on("new_order", (order) => { ... });          // ✅ Implemented
socket.on("order_taken", (orderId) => { ... });      // ❌ Missing
socket.on("order_canceled", (orderId) => { ... });   // ❌ Missing

// Customer flow (NOT YET IMPLEMENTED on backend)
socket.on("order_accepted", (data) => { ... });      // ❌ Missing
socket.on("order_completed", (data) => { ... });     // ❌ Missing
socket.on("order_canceled", (data) => { ... });      // ❌ Missing
```

---

## 5. 🚀 Actionable Recommendations

### Priority 1 — 🔴 Critical: Fix Before Any Frontend Work

---

#### P1.1 — Fix Import Paths for Zod Schemas

**Files:** `src/routes/authRoutes.js`, `src/routes/orderRoutes.js`

```javascript
// authRoutes.js — fix line 5-8
import { registerSchema, loginSchema } from "../middleware/authSchemas.js";

// orderRoutes.js — fix line 13
import { createOrderSchema } from "../middleware/orderSchemas.js";
```

---

#### P1.2 — Fix validate(createOrderSchema) Invocation Order

**File:** `src/routes/orderRoutes.js` line 19

```javascript
// ❌ Before
router.post("/", authenticate, createOrderSchema(validate), asyncHandler(createOrder));

// ✅ After
router.post("/", authenticate, validate(createOrderSchema), asyncHandler(createOrder));
```

---

#### P1.3 — Import Sequelize Associations in server.js

**File:** `src/server.js`

```javascript
import "./models/associations/index.js"; // add this — registers all model relationships
```

---

#### P1.4 — Fix registerSchema to Include Role and area_id Fields

**File:** `src/middleware/authSchemas.js`

```javascript
export const registerSchema = z.object({
  email:    z.string().trim().email("Please provide a valid email address").max(254),
  password: z.string().min(8, "Password must contain at least 8 characters").max(72),
  role:     z.enum(["CUSTOMER", "BARBER"]).default("CUSTOMER"),
  area_id:  z.coerce.number().int().positive().optional(),
});
```

---

#### P1.5 — Fix Single-Order Endpoint (getMyOrderId)

**File:** `src/controllers/orderController.js`

```javascript
// ❌ Before — findAll + truthy check that never fires
const orders = await Order.findAll({ where: { id, customer_id: req.user.id } });
if (!orders) { ... }

// ✅ After — findOne with correct null check
const order = await Order.findOne({ where: { id, customer_id: req.user.id } });
if (!order) return res.status(404).json({ message: "Order not found" });
return res.status(200).json({ order });
```

---

#### P1.6 — Add jsonwebtoken to package.json

**File:** `package.json`

```json
"jsonwebtoken": "^9.0.2"
```

---

### Priority 2 — 🟠 High: Real-Time Completeness

---

#### P2.1 — Emit Socket Events for All Order State Transitions

**File:** `src/controllers/orderController.js`

After every successful DB update, emit targeted room events:

```javascript
// acceptOrder — notify customer and other barbers in the area
io.to(`user_${order.customer_id}`).emit("order_accepted", { order_id: id, barber_id: barber.id });
io.to(`area_${barber.area_id}`).emit("order_taken", { order_id: id });

// completeOrder — notify customer
io.to(`user_${order.customer_id}`).emit("order_completed", { order_id: id });

// cancelOrder by customer — notify area barbers
io.to(`area_${order.area_id}`).emit("order_canceled", { order_id: id });

// cancelOrder by barber — notify customer
io.to(`user_${order.customer_id}`).emit("order_canceled", { order_id: id });
```

---

#### P2.2 — Add Personal Room for All Users on Socket Connection

**File:** `src/sockets/socketHandler.js`

```javascript
io.on("connection", (socket) => {
  const user = socket.data.user;
  socket.join(`user_${user.id}`); // ← every user joins their personal room

  socket.on("join_area", (areaId, callback) => { ... }); // barbers additionally join area rooms
});
```

---

#### P2.3 — Add HTTP CORS and Security Headers

**File:** `src/server.js`

```bash
npm install cors helmet
```

```javascript
import cors from "cors";
import helmet from "helmet";

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
```

---

#### P2.4 — Add Rate Limiting to Auth Endpoints

**File:** `src/routes/authRoutes.js`

```bash
npm install express-rate-limit
```

```javascript
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many requests, please try again later." }
});

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login",    authLimiter, validate(loginSchema),    login);
```

---

### Priority 3 — 🟡 Medium: Production Hardening

---

#### P3.1 — Add Database Indexes to Order.js

```javascript
{
  tableName: "orders",
  timestamps: true,
  indexes: [
    { fields: ["area_id", "status", "barber_id"] },
    { fields: ["customer_id", "createdAt"] },
    { fields: ["barber_id", "status"] },
  ]
}
```

---

#### P3.2 — Configure Sequelize Connection Pool

**File:** `src/config/database.js`

```javascript
pool: { max: 20, min: 2, acquire: 30000, idle: 10000 }
```

---

#### P3.3 — Exclude Password Hash from User Queries by Default

**File:** `src/models/User.js`

```javascript
{
  tableName: "users",
  timestamps: false,
  defaultScope: {
    attributes: { exclude: ["password"] }
  },
  scopes: {
    withPassword: { attributes: {} } // used only in authController login
  }
}
```

---

#### P3.4 — Include area_id in JWT Payload

**File:** `src/controllers/authController.js`

```javascript
const token = jwt.sign(
  { id: user.id, role: user.role, area_id: user.area_id },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);
```

Eliminates the redundant `User.findByPk(req.user.id)` calls in 4 controller functions and the DB query in `socketAuth.js`.

---

#### P3.5 — Standardize API Response Envelope

```json
{ "success": true, "message": "Order created successfully", "data": { "order": { ... } } }
```

---

#### P3.6 — Expand User Profile for Mobile UX

Add to `src/models/User.js`:

| Field | Type | Notes |
|---|---|---|
| `name` | `DataTypes.STRING` | Display name |
| `phone_number` | `DataTypes.STRING` | Contact info |
| `is_available` | `DataTypes.BOOLEAN` | Barber on/off duty toggle |
| `profile_picture_url` | `DataTypes.STRING` | Optional avatar URL |

---

#### P3.7 — Add Missing REST Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/orders/active` | Get current active order for authenticated user on app launch |
| `GET /api/barbers?area_id=X` | Customer: browse available barbers in an area |
| `GET /api/orders?page=1&limit=20` | Paginated order history |
| `PATCH /api/users/me` | Update user profile (name, phone, availability) |

---

#### P3.8 — Replace sequelize.sync() with Migrations

Replace the startup `sync()` call with Sequelize CLI migrations for production stability. Run `areaSeeder.js` once via `npm run seed`, not on every process restart.

---

## Summary Scorecard

| Category | Score | Key Issue |
|---|---|---|
| **Structural Correctness** | 3 / 10 | Server cannot boot — fatal import path + invocation bugs |
| **Security** | 4 / 10 | No rate limiting, no CORS, `jsonwebtoken` undeclared, Zod strips role |
| **Real-Time Completeness** | 2 / 10 | Only 1 of 5 needed socket events is implemented |
| **Database Design** | 5 / 10 | No indexes, no pool config, associations never wired |
| **API Contract Quality** | 4 / 10 | Inconsistent envelopes, silent 404 bug, missing fields |
| **Frontend Readiness** | 3 / 10 | Core socket events missing, key user profile fields absent |

> **Estimated time to resolve all Priority 1 items:** ~2–3 focused hours.
> **Estimated time to resolve all Priority 2 items:** ~1–2 days.
> After completing P1 and P2, the backend will be solid enough to drive full Expo frontend development.

---

*This report was generated from a read-only static analysis. No project files were modified.*
