# BARBERO Mobile App — Implementation Plan

## 1. Project Overview

**BARBERO** is a mobile application built with React Native, Expo, TypeScript, and Expo Router.

The app supports two user roles:

- **Customer:** Select a service, choose an area, create booking requests, and track orders.
- **Barber:** View available requests, accept a job, and manage the active job.

The goal is to build a clean, premium mobile experience while preserving the existing working code.

## 2. Important Rules for Antigravity

Before implementing anything:

1. Inspect the existing `barbero-mobile` project.
2. Read the existing navigation structure, screens, components, assets, and configuration.
3. Compare the current project with this plan.
4. Identify what already works and what is missing.
5. Propose the smallest safe implementation plan before changing files.

**Do not start modifying files until the user explicitly approves the proposed implementation plan.**

### Strict restrictions

- Work only inside `barbero-mobile`.
- Do not open, inspect, modify, or refactor the backend directory.
- Do not modify backend APIs or database models.
- Do not install dependencies without explicit approval.
- Preserve the existing Welcome screen and all working features.
- Avoid unrelated refactoring, renaming, and file deletion.
- Reuse existing components when possible.
- Never claim an API operation succeeded unless the server confirms success.
- If a requirement cannot be supported by the existing API, explain the limitation instead of inventing an endpoint.

## 3. Technology

- React Native
- Expo
- TypeScript
- Expo Router
- Existing project dependencies, wherever possible

Inspect the current project before choosing any additional library.

## 4. Visual Design

Use a premium, minimal black-and-gold visual identity.

| Element | Color |
|---|---|
| Main background | `#111111` |
| Card background | `#1C1C1C` |
| Primary accent | `#C6A15B` |
| Primary text | `#FFFFFF` |
| Secondary text | `#BDBDBD` |
| Borders and dividers | `#383838` |

### Design principles

- Minimal and elegant interface.
- Consistent spacing and typography.
- Rounded cards and buttons where appropriate.
- Clear visual hierarchy.
- Accessible text contrast.
- Safe-area support.
- Loading, empty, error, and retry states.
- Consistent reusable UI components.
- Use the existing logo asset when appropriate.
- Avoid unnecessary animations and decorative clutter.

## 5. Public Screens

### 5.1 Welcome Screen

The existing Welcome screen is already implemented.

- Preserve its current design and behavior.
- Keep the existing logo and visual identity.
- Provide navigation to Login and Register if those actions are not already present.
- Do not redesign it without approval.

### 5.2 Login Screen

Proposed route: `app/login.tsx`, subject to inspection of the existing structure.

Fields:

- Email
- Password

Behavior:

1. Validate required fields.
2. Send credentials to the existing login endpoint.
3. Handle loading and errors.
4. Store the authentication session using the existing project approach, after inspecting it.
5. Route the user according to the role returned by the server:
   - `CUSTOMER` → Customer application.
   - `BARBER` → Barber application.
6. Never hardcode a successful login.

### 5.3 Registration Screen

Fields:

- Full Name
- Email
- Password
- Confirm Password
- Role selection

Roles displayed:

- Customer
- Barber

Behavior and limitations:

- Validate all required fields.
- Confirm Password is only for client-side validation and must not be sent to the API.
- The current backend registration endpoint supports email and password and defaults the role to `CUSTOMER`.
- The current backend validation does not persist Full Name.
- Barber registration is not supported by the current public registration endpoint.
- Therefore, do not imply that Full Name has been saved.
- Do not send unsupported role fields and pretend they were accepted.
- Disable or clearly explain the unavailable Barber registration option.
- Only implement registration behavior supported by the existing API.

Do not change the backend to resolve these limitations.

## 6. Customer Application

The Customer bottom navigation should contain three tabs:

1. Book
2. My Orders
3. Profile

### 6.1 Book Screen

Responsibilities:

- Fetch available areas using the existing areas endpoint.
- Show areas in a clear selection interface.
- Provide preset service choices, for example:
  - Haircut
  - Beard Trim
  - Haircut + Beard
- Allow the customer to select one or more services, if the UI supports it clearly.
- Collect the required area and service details.
- Submit a booking through the existing orders endpoint.

The current API accepts `area_id` and `service_details`.

Convert the selected service choices into a valid `service_details` string. Do not invent a service catalog or prices.

Show loading, success, and error states based on the actual API response.

### 6.2 My Orders Screen

Responsibilities:

- Fetch the authenticated customer's orders.
- Display relevant order information, including service details, status, and area ID when available.
- Provide pull-to-refresh or a refresh action.
- Display an informative empty state.
- Allow navigation to Order Details if supported by the current response.

Do not invent barber names, phone numbers, prices, or other unavailable fields.

### 6.3 Order Details Screen

Responsibilities:

- Fetch an individual order using the existing order-details endpoint.
- Display the fields returned by the API.
- Allow cancellation only when the order status is `PENDING`.
- Use the existing cancel endpoint.
- Refresh the UI using the actual server response.

Do not show unsupported information as if it exists.

### 6.4 Customer Profile Screen

Responsibilities:

- Fetch the current profile using the existing `/api/auth/me` endpoint.
- Display available profile information, such as email, role, and area ID if present.
- Provide Logout.
- Do not implement profile editing because the current API does not support it.

## 7. Barber Application

The Barber bottom navigation should contain three tabs:

1. Requests
2. Active Job
3. Profile

### 7.1 Requests Screen

Responsibilities:

- Fetch available requests using the existing `/api/orders/available` endpoint.
- Display available order details returned by the API.
- Allow a barber to accept a pending request using the existing accept endpoint.
- Refresh the list after a confirmed successful action.
- Provide manual refresh and clear error states.

Do not rely on Socket.IO for correctness. The current backend has a known socket room-joining issue, and the backend must remain unchanged.

### 7.2 Active Job Screen

Responsibilities:

- Provide a dedicated bottom tab for the currently accepted job.
- Display the accepted order details.
- Allow the barber to complete the job using the existing complete endpoint.
- Allow cancellation using the existing cancel endpoint when supported by the order status and API.
- Update the screen only after receiving a confirmed API response.

The current backend does not provide a dedicated endpoint to restore a barber's active job after an application restart.

Inspect existing mobile persistence first. If a suitable storage solution already exists, use it to preserve the accepted order ID or order data locally. Do not install a new dependency without approval.

Explain the limitation: local persistence does not guarantee that the stored job still has the same status on the server. Handle stale data safely.

### 7.3 Barber Profile Screen

Responsibilities:

- Fetch the profile using `/api/auth/me`.
- Display available information, such as email, role, and area ID.
- Provide Logout.
- Do not implement profile editing, area changes, or online/offline controls because these are unsupported by the current API.

## 8. Authentication and Navigation

Inspect the current Expo Router structure before creating route groups or changing layouts.

Expected behavior:

- Public users can access Welcome, Login, and Register.
- Authenticated customers enter the Customer application.
- Authenticated barbers enter the Barber application.
- The Customer tab bar is only visible inside the Customer application.
- The Barber tab bar is only visible inside the Barber application.
- Public screens do not display an authenticated bottom tab bar.
- Logout clears the locally stored session and returns the user to the public flow.
- Prevent users from accessing the other role's screens where practical.

Do not blindly create the proposed route names if equivalent routes or layouts already exist. Reuse the current structure wherever possible.

## 9. API Integration

Use only the existing API endpoints identified in the project and approved backend audit.

| Purpose | Method | Endpoint |
|---|---|---|
| List areas | GET | `/api/areas` |
| Register customer | POST | `/api/auth/register` |
| Login | POST | `/api/auth/login` |
| Current profile | GET | `/api/auth/me` |
| Create order | POST | `/api/orders` |
| Customer order history | GET | `/api/orders` |
| Available barber requests | GET | `/api/orders/available` |
| Order details | GET | `/api/orders/:id` |
| Accept request | PATCH | `/api/orders/:id/accept` |
| Complete job | PATCH | `/api/orders/:id/complete` |
| Cancel order/job | PATCH | `/api/orders/:id/cancel` |

Replace `:id` with the actual order ID.

Before implementation, inspect the existing mobile API configuration and request helpers. Reuse them if they are appropriate.

Do not guess the API base URL. If it is missing or incorrect, ask the user before changing it.

## 10. Known Limitations

The following features are out of scope for this phase:

- Backend changes
- Saving Full Name through the current registration API
- Public Barber registration
- Payments
- Chat
- Ratings and reviews
- Choosing a specific barber by name
- Service pricing
- Profile editing
- Changing a barber's assigned area
- Barber online/offline status
- Dependence on real-time socket updates
- Guaranteed server-side restoration of an active job after app restart

If any of these become necessary, document the limitation and request approval before expanding scope.

## 11. Implementation Phases

### Phase 0 — Read-only audit

- Inspect the mobile project structure.
- Identify existing screens, routes, layouts, assets, styles, API helpers, and authentication code.
- Determine which screens already work.
- Compare the current state with this plan.
- Report missing pieces, risks, and the smallest safe sequence of changes.
- Do not edit files.

### Phase 1 — Shared foundation

After approval:

- Establish or reuse shared colors and UI components.
- Confirm the existing navigation approach.
- Confirm the existing API and session-handling approach.
- Preserve the Welcome screen.

### Phase 2 — Authentication

After approval:

- Implement or complete Login.
- Implement or complete Register within the current API limitations.
- Add role-based routing.

### Phase 3 — Customer experience

After approval:

- Book
- My Orders
- Order Details
- Profile

### Phase 4 — Barber experience

After approval:

- Requests
- Active Job
- Profile

### Phase 5 — Validation

After approval:

- Run TypeScript checks using the existing project setup.
- Run available Expo checks without installing new dependencies.
- Test navigation and role separation.
- Test loading, empty, error, retry, and logout states.
- Verify API failures are not shown as successes.
- Report the files changed and tests performed.
- List unresolved limitations.

## 12. Required First Response from Antigravity

For the first task, perform **Phase 0 only**.

Return:

1. Existing mobile project structure.
2. Existing screens and navigation.
3. Existing reusable components and color definitions.
4. Existing logo and asset usage.
5. Existing API integration and session storage, if any.
6. What already works.
7. What is missing compared with this plan.
8. Risks or inconsistencies.
9. A minimal, ordered implementation proposal.

**Do not modify any files during this first audit. Do not access the backend directory. Wait for explicit user approval before implementing changes.**