# Profile Page Specification

## Problem

The social media app currently lacks a working Profile page. Users cannot:
- Visit their own profile by clicking the profile icon in the navigation.
- Visit another user's profile by clicking their avatar, username, or handle.
- See profile information (name, handle, bio), stats (posts/followers/following), and posts in a responsive layout.
- Access account Settings (reserved entry point) on their own profile.
- Benefit from backend-enforced privacy and authorization when viewing private accounts.

## Users

1. **Authenticated User (Owner)** — visits their own profile page; expects full info + Settings entry point.
2. **Authenticated Viewer** — visits another user's public or private profile; content must respect follow/privacy rules.
3. **Unauthenticated Viewer** — may only see public content and never email or internal fields.

## Goals

- Deliver a clean, modern, responsive Profile page matching the visual references (desktop banner layout + mobile stats-above-bio layout).
- Support two scenarios seamlessly: owner profile and other-user profile.
- Provide a Settings entry point (desktop top-right gear, mobile 3-line menu drawer with a Settings row) — Settings UI itself is out of scope (stub only).
- Enforce privacy and ownership on the backend; never trust frontend visibility decisions alone.
- Integrate navigation: profile tab/avatar → owner's profile; user mentions/avatars → user profile by `username` (handle).
- Reuse existing architecture: MainLayout, LeftCornerNav, MobileTopNav, auth/authSlice, designSystem, User/Post models.

## Non-Goals (explicitly excluded, some crossed out in reference images)

- Banner upload/edit (banner area exists as a visual shell, no upload/edit controls).
- Collections / Links count stat cards (crossed out).
- Subscribed / Expires labels (crossed out).
- Likes tab (crossed out).
- Tagged / Posts of you tab (mobile 3rd tab crossed out).
- Story Highlights row (mobile image row crossed out).
- Working Settings sub-form/modal (only navigation/stub entry point).
- Follow/Unfollow, Message, Edit Profile interactive buttons working logic (UI only with placeholder onClick logs is acceptable; state handled via demo/dispatch).
- Post click full-size viewer (click targets are demo-only).

## Functional Requirements

### Backend — Profile endpoint (`GET /api/users/:username`)

FR1. The existing `getUser` controller is upgraded to support "viewer-aware" responses:
- Accept an optional authenticated viewer identity via existing `isAuth` middleware when token present (no auth required for public data; viewer identity extracted when bearer token is available).
- Decide ownership on the backend by comparing `profileUser._id` to authenticated viewer's `sub`.
- Always return: `_id, name, username, avatar, bio, isPrivate, followerCount, followingCount, postCount, followers, following, posts (filtered), createdAt`.
- Include `email` **only** when viewer === owner AND authenticated.
- Include `gender` for owner; for non-owner: allow it only if profile is public (OR viewer is following the private user owner); otherwise omit `gender`.
- Never return `password, tokenVersion, resetPassword*`, `emailVerification*`, or any token.

FR2. Private-account enforcement on posts list:
- `isPrivate: false` → viewer gets populated post objects for the user's `posts` array.
- `isPrivate: true`:
  - Owner view → full posts.
  - Viewer already in user's `followers` array → full posts.
  - Other viewers → `posts` array returned as empty `[]`; response field `postsRestricted: true` added.

FR3. Add a `isOwner: boolean` and `isFollowing: boolean` and `isFollower: boolean` in response for frontend UI decisions (follow state UI, Settings button visibility).

### Backend — Ownership invariant

FR4. Settings/EditProfile ownership MUST be enforced on backend via `req.user.sub === user._id`, never only frontend UI hiding. For the profile GET route, email/internal fields follow FR1.

### Frontend — Routing and navigation

FR5. React Router routes:
- `/me` → Current authenticated user profile; redirects to `/login` if not authenticated.
- `/:username` → Other user's profile (or self if viewer navigates to own handle).
- Both use MainLayout so desktop/mobile navigation chrome (LeftCornerNav, MobileTopNav) renders.

FR6. LeftCornerNav profile "Profile" tab (`id: 'profile'`) onClick navigates to `/me` (owner profile).
FR7. Anywhere a username/avatar is clickable (suggestions, chats, posts) → navigate to `/${username}`. Existing demo data should wire navigation; at minimum the ProfilePage supports URL param navigation and the profile tab navigation works.

### Frontend — Page layout

FR8. Desktop layout (≥lg matches HomePage layout rules):
- Max width constrained content inside MainLayout's Outlet; LeftCornerNav visible at ≥lg, MobileTopNav on <lg.
- Top area: banner strip (visual banner placeholder), avatar overlapping banner on the left with gradient ring.
- Header row (name + blue tick, @handle, stats card: Followers, Posts) → reference image layout.
- Top-right has a Settings button (gear icon or Settings label area). This button **renders only when `isOwner` is true**.
- Tabs row: `Posts [N]`, `Photos [N]`, `Videos [N]` — tabs switch the content area. Do NOT render the Likes tab.
- Bio text before the stats card.
- Under tab, a grid of post cards (thumbnail, author footer, like/comment counts per reference).
- Other-user profile shows a "Message" action button + "follow state pill" area; owner profile does not show Message.

FR9. Mobile layout (<lg):
- Top bar with back button (popState), handle (dropdown not functional) + create (stub) + 3-line hamburger on right.
- Hamburger opens a drawer/bottom sheet that contains at minimum a "Settings" row (stub onClick). Sheet closes on outside click / escape.
- Avatar (ringed, large) left side; top row stat counts "Posts / Followers / Following" as 3 tap-targets (numeric headings, labels below).
- Then Name, bio, 3 tabs `Posts / Videos` → only the two tabs, 3rd tagged tab NOT rendered.
- 3-column posts grid below tabs (matching mobile reference pattern of 3 equal thumbnail columns).

### Frontend — Privacy states

FR10. Private account renders correctly:
- Banner and header info still shown (name, avatar, handle, follower/following counts, bio length, isPrivate badge if UI decides to show).
- If restricted viewer (not following / not owner) → replace posts grid with an empty-state card: "This account is private. Follow to see posts." instead of post thumbnails.
- Frontend respects only the API response fields (`postsRestricted` / empty posts array) — never guess based on `isPrivate` alone (backend is source of truth).

### Frontend — Design consistency

FR11. All colors, radius, shadows, motion, font size, letter spacing, and font family are pulled from the existing `@doc/designSystem` object (no hardcoded arbitrary colors unless CSS variable fallback was already used in HomePage). The page must look visually consistent with HomePage, SignUp, Login screens.

## Non-Functional Requirements

NFR1. Security — Backend profile endpoint must return no sensitive fields to non-owner viewers. Auth for ownership enforced via `req.user.sub` comparison on the server.
NFR2. Responsive — Page works on 360px (mobile) up to 1600px (desktop XL). Uses the same breakpoints as HomePage: `lg` for desktop sidebar.
NFR3. Performance — Profile data + posts fetched in a single API call (aggregation or find + populate); no N+1 population.
NFR4. Error handling — 404 user-not-found, 401 redirect-to-login for `/me` unauthenticated, network error shows inline message with a Retry button.
NFR5. Maintainability — Reuse `Avatar` and `FollowPill` from `HomeLeftSidebar.jsx`. Reuse existing redux `authSlice` patterns for data state loading/error. New `profileSlice` if state is needed beyond `useEffect->fetch`.

## Constraints

- Do not rename existing files. Do not unnecessarily restructure pages/routes folders.
- User schema already has `name` (display) + `username` (handle, unique, lowercase). Keep as-is from the current refactor.
- Existing `user.route.js` pattern of `GET /:username` is kept; the new `GET /me` route resolves to owner.
- Existing `LeftCornerNav.LEFT_NAV_TABS` single source of truth is preserved; profile tab behavior is routed navigation, not state-only tabs.
- Use `cn()` from `@/lib/utils`, `designSystem` from `@doc/designSystem`, lucide icons for buttons/icons.

## Dependencies / Assumptions

- Post model's `media` field stores an image URL that can be rendered in a responsive grid.
- User model's `posts` field stores `[ObjectId]` references to Post documents.
- Populate/populate virtuals works via standard Mongoose populate.
- For demo data fallback: if user has no posts, sample placeholder thumbnails are fine for UI (use gradient / image via text_to_image API call is not required, but if placeholder needed use standard placeholders).
- User mentioned: "I will manage setting form there later" → Settings entry point only (stub button/row with onClick console.info).

## Open Questions

None. User already explicitly called out Settings position (top-right yellow on desktop, 3-line hamburger sheet on mobile), and which features are crossed out.

---

## Acceptance Criteria

### Rule ACs

- AC1.rule — Navigate to `/me` while authenticated loads the owner profile: shows avatar, name, `@username`, bio, stats, posts grid, and a Settings button top-right.
- AC2.rule — Navigate to `/aditya123` (other user) does NOT show Settings button; if user is public, posts render.
- AC3.rule — Backend `GET /api/users/:username` for a viewer that is NOT owner NEVER returns `email` in the response JSON body when checked via API test (Postman/curl).
- AC4.rule — Backend for `isPrivate=true` user and a viewer NOT in followers: response has `postsRestricted === true` and `posts` array is length 0.
- AC5.rule — Backend ownership decision compares `req.user.sub` (JWT sub) to user `_id`, never a header flag or query param.
- AC6.rule — Mobile viewport (<1024px) does NOT show desktop Settings top-right button; instead, the 3-line hamburger opens a sheet with Settings row.
- AC7.rule — Desktop viewport (≥1024px) does render Settings button top-right when `isOwner === true`.
- AC8.rule — Tabs rendered: desktop has Posts / Photos / Videos (NO Likes). Mobile has Posts / Videos (NO Tagged).
- AC9.rule — LeftCornerNav "Profile" tab routes user to `/me` page.
- AC10.rule — Page routes are registered in React Router under MainLayout so navigation chrome (LeftCornerNav + MobileTopNav) appears.
- AC11.rule — API response body never contains `password`, `tokenVersion`, `resetPasswordToken`, `resetPasswordTokenExpire`, `emailVerificationToken`, `emailVerificationExpireAt` for any viewer type.
- AC12.rule — `/me` unauthenticated redirects to `/login` (or renders CTA without crashing).

### Rubric ACs

- AC13.rubric — Design fidelity: Profile page visually matches the two reference layouts and stays consistent with the HomePage UI. Scale 0-3 (0 no match, 2 acceptable, 3 near pixel parity with reference shapes and spacing). Pass ≥2.
- AC14.rubric — Responsive behavior: layouts collapse cleanly at 360/768/1024/1280 widths; no horizontal scrollbars, no clipped avatars. Pass ≥2.
- AC15.rubric — Code consistency with existing patterns (authSlice thunks, controller error shape, Zod validators, cn + designSystem usage). Pass ≥2.
- AC16.rubric — Security: Authorization and privacy enforcement layered checks: backend ownership, backend posts restriction, frontend graceful restricted-state display. Pass ≥2.
