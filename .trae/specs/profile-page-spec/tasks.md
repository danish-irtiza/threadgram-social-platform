# Profile Page Implementation Tasks

This document maps each Acceptance Criterion from `spec.md` to atomic, dependency-ordered implementation tasks. Each task contains Test Requirements (TR) as `rule` (binary pass/fail) or `rubric` (scored).

---

## Task 1: Backend — `/api/users/:username` viewer-aware profile + privacy enforcement

**Status:** pending
**Priority:** high
**Acceptance Criterion coverage:** AC3, AC4, AC5, AC11, FR1, FR2, FR3, FR4, NFR1

### Scope
Modify `user.controller.js` `getUser` controller and add a new `getMe` controller; update `user.route.js` to mount `/me` with `isAuth` and handle optional-auth on `/:username`.

### Changes
- `controllers/user.controller.js`
  - Add a new helper `sanitizeProfileResponse(profileUser, viewer)` that computes `isOwner`, `isFollowing`, `isFollower`, decides `email` inclusion, decides `gender` visibility, filters posts based on `isPrivate` + follow state, sets `postsRestricted`.
  - Upgrade `getUser` to optionally read viewer from `req.user` if present (make `isAuth` optional so unauthenticated can still read public profiles).
  - Add new `getMe` controller that uses `req.user.sub` → finds user → calls same sanitize helper so response shape is identical.
  - Use Mongoose `populate('posts', '_id author mediaType media caption like comment createdAt')` on the user document; if posts restricted replace with `[]`.
- `routes/user.route.js`
  - Add `router.get("/me", isAuth, getMe)` BEFORE `/:username`.
  - Keep `/:username` public; for best-effort viewer awareness, apply a permissive middleware that verifies token if present but does not throw 401 if missing.

### Task-local Test Requirements

- TR1.rule — `GET /api/users/john_doe` (public, no auth) response body does NOT contain key `email`.
- TR2.rule — `GET /api/users/me` (owner, valid token) response contains `email: owner@example.com`, `isOwner: true`.
- TR3.rule — `GET /api/users/:id` of a `isPrivate: true` user, with viewer NOT in `followers`: response has `postsRestricted: true`, `posts.length === 0`.
- TR4.rule — Same as TR3 but viewer IS in followers: `postsRestricted: false`, `posts.length >= 0` (populated).
- TR5.rule — No response body contains `password|tokenVersion|resetPasswordToken|resetPasswordTokenExpire|emailVerificationToken|emailVerificationExpireAt` (regex grep on JSON response).
- TR6.rule — Ownership check uses `req.user.sub` vs `user._id.toString()` comparison on the server (static code analysis confirms).
- TR7.rule — `GET /api/users/somebody` with an invalid token should still return a public-profile response (optional auth on `/:username` does not 401 on bad tokens).

---

## Task 2: Frontend routes + ProfilePage shell, navigation wiring, `/me` redirect

**Status:** pending
**Priority:** high
**Acceptance Criterion coverage:** AC9, AC10, AC12, FR5, FR6, FR7

### Scope
- Register `/me` and `/:username` routes under MainLayout.
- Export `ProfilePage` from pages index.
- Profile tab click in LeftCornerNav and HomePage dispatches navigation to `/me`.
- Unauthenticated `/me` redirects to `/login`.

### Changes
- `Frontend/src/pages/index.js` → add `export { default as ProfilePage } from './profile.jsx'`.
- `Frontend/src/routes/router.jsx` → under MainLayout children add:
  ```
  { path: '/me', element: <ProfilePage /> },
  { path: '/:username', element: <ProfilePage /> },
  ```
- `Frontend/src/components/navigation/LeftCornerNav.jsx` — tabs remain state-tracking for `activeId` but page navigation should happen in parent (`navigate`). Update HomePage onChange handler to route navigation based on tab id. `profile` tab id → navigate `/me`. Alternatively wrap `button` onClick to route, but keep onChange contract.
- ProfilePage component (`pages/profile.jsx`) uses params + `useNavigate`: if `params.username` is missing and pathname is `/me`, fetch `/api/users/me`. If no viewer authenticated, redirect to `/login`.

### Task-local Test Requirements

- TR1.rule — Dev server running; click profile icon renders page with route `/me`.
- TR2.rule — Visiting `/#/johndoe` (or plain `/johndoe`) path renders profile for user `johndoe` without Settings button.
- TR3.rule — Visiting `/me` when `accessToken` is missing in localStorage redirects to `/login`.
- TR4.rule — Both routes render LeftCornerNav desktop + MobileTopNav mobile (they are child of MainLayout).

---

## Task 3: Frontend ProfilePage desktop layout

**Status:** pending
**Priority:** high
**Acceptance Criterion coverage:** AC1, AC2, AC6, AC7, AC8, FR8, FR11, NFR2, NFR4

### Scope
Implement desktop view of ProfilePage that closely matches reference:
- Banner strip (visual shell placeholder). Avatar overlap. Name + blue tick, @handle, bio. Stats card: Followers, Posts.
- Tabs Posts / Photos / Videos (NO Likes).
- Posts grid with thumbnails + footer metadata.
- **Desktop Settings button (top-right yellow area)** — shows only when `isOwner: true`. Click: `console.info('[Settings] open')` stub.
- Other user profile: Show Message button (stub) + Follow pill state area (stub).

### Changes
- `pages/profile.jsx` — Full desktop layout in a `hidden lg:flex`/similar responsive container structure. Reuse `Avatar` and `FollowPill` exported from `HomeLeftSidebar.jsx`. Use designSystem for palette/shadow/motion. Banner placeholder uses a gradient from designSystem colors or fixed image placeholder. For each media type: count Photos (mediaType==='image'), Videos (mediaType==='video'). Posts tab shows all posts as cards. Mobile and desktop share one component with responsive class branches.

### Task-local Test Requirements

- TR1.rule — On `lg:` breakpoint (1024px+), Settings button rendered only when `isOwner: true`.
- TR2.rule — Tabs visible only as Posts, Photos, Videos. Likes DOM element absent.
- TR3.rule — Stats card has Followers and Posts numeric counts matching API response.
- TR4.rule — Followers N uses `followerCount`, Posts N uses `postCount` from API.
- TR5.rule — Owner profile does not show the "Message" button.
- TR6.rule — Other user profile (not owner, public) does NOT show the Settings button.
- TR7.rubric — Visual fidelity to desktop reference. Scale 0-3, pass >= 2: banner present, avatar overlaps, tabs row, grid of cards with rounded corners, 1-2px borders, layout left-column-header / right-column-grid roughly matches aspect ratios of reference.

---

## Task 4: Frontend ProfilePage mobile layout + 3-line hamburger Settings sheet

**Status:** pending
**Priority:** high
**Acceptance Criterion coverage:** AC6, AC8, FR9, NFR2

### Scope
Mobile viewport layout:
- Top bar: Back + user handle (stub dropdown arrow non-functional) + Plus icon (stub) + Menu 3-lines on top right.
- Menu opens a drawer / bottom sheet containing a Settings row (click stub). Click backdrop or close or Esc closes sheet.
- Large avatar with gradient ring on left. 3 stats columns: Post (count), Followers (count), Following (count).
- Name + bio below stats area.
- 2 Tabs only: Posts / Videos (3rd tagged tab NOT rendered).
- 3-column posts thumbnail grid below tabs.
- Restricted state: private user not followed → replace grid with empty-state card "This account is private".

### Changes
- Same `pages/profile.jsx` file — add responsive sections. Mobile top bar & sheet is shown <lg. Desktop settings hidden <lg. Use `useState` for sheet open. Lucide icons: `Menu, ChevronLeft, PlusSquare, Settings, X`.

### Task-local Test Requirements

- TR1.rule — On mobile width (<1024px) desktop Settings button is not present in DOM.
- TR2.rule — Clicking 3-line hamburger opens the sheet; Settings row visible inside. Clicking Settings row runs onClick (visible in console).
- TR3.rule — 3-line sheet closes on outside-click (or overlay click) and on Escape key.
- TR4.rule — Mobile Tabs render exactly 2: `Posts` and `Videos`. Tagged tab DOM node absent.
- TR5.rule — Mobile post area is 3 equal columns (grid-cols-3) below the tabs.
- TR6.rule — Private / restricted user: empty-state message shown instead of post thumbnails.
- TR7.rubric — Mobile visual fidelity to the second reference image. Scale 0-3, pass >= 2: avatar + 3 stats row layout correct; top bar matches positions (Back left, Plus + Menu right); sheet is visually distinct overlay.

---

## Task 5: Redux data fetching, loading, error, restricted-state display

**Status:** pending
**Priority:** medium
**Acceptance Criterion coverage:** AC1, AC2, AC4, AC12, NFR4, FR10

### Scope
Profile data loading: use `useEffect + useState` pattern OR `createAsyncThunk` in profileSlice (reuse existing empty profileSlice.js). Loading skeleton/Spinner during fetch. Error view: "Failed to load profile" + Retry button. Restricted view (postsRestricted) message.

### Changes
- `profileSlice.js` (if chosen) – add `fetchProfile(username?: string)` thunk, `getMe` flag, reducers for pending/fullfilled/rejected.
- ProfilePage selects `isLoading, isError, error, profile` from slice. For `/me` call with `username=null` and thunk hits `/me` endpoint.
- Display Skeleton/Avatar placeholders while loading. For 404, a "User not found" card.

### Task-local Test Requirements

- TR1.rule — During pending state, skeleton/loading indicators render; final UI replaces when resolved.
- TR2.rule — `postsRestricted: true` + `posts.length === 0` renders empty-state card instead of post grid.
- TR3.rule — `isPrivate: false` AND `postsRestricted: false` shows posts regardless of viewer (frontend should not decide restriction from `isPrivate`).
- TR4.rule — Network failure (mocked via bad server) shows error message + Retry; clicking Retry triggers refetch.

---

## Task 6: Final end-to-end & syntax verification

**Status:** pending
**Priority:** medium
**Acceptance Criterion coverage:** AC1–AC16

### Scope
- `node --check` on every changed backend JS file.
- Frontend build or type check (whichever the project has) for errors.
- Manual simulated flows in notes below as Completion Evidence:
  1. Profile icon → `/me` owner page loads.
  2. Suggestion click → `/username` other user page loads.
  3. Unauthenticated `/me` redirects.
  4. Private non-followed profile → no posts.
  5. Desktop Settings visibility vs mobile hamburger sheet visibility.

### Task-local Test Requirements
- TR1.rule — All `node --check` passes for modified backend files (no syntax errors).
- TR2.rule — Frontend `npm run build` or `eslint` (project default) runs with zero errors (zero exit).
- TR3.rule — Manual flow checklist (above) verified as per notes in Completion Evidence.
