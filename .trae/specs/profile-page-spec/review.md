# Review — Profile Page Feature

Reviewer context: Trae internal review after implementation.
Spec: `.trae/specs/profile-page-spec/spec.md`
Tasks: `.trae/specs/profile-page-spec/tasks.md`

## Review History

### Cycle 1 — Initial implementation review

#### Rule ACs — Evidence

| AC | Status | Evidence |
|---|---|---|
| AC1.rule — `/me` authenticated → owner profile with Settings top-right | pass | Routes registered at `router.jsx` L13-L16 → `profile.jsx` renders desktop Settings button `[Settings]` at L351-L370 inside `isOwner &&` and fetches via `/api/users/me` (profileSlice thunk). Populates name, @username, bio, stats, posts on success. |
| AC2.rule — Other user route → no Settings; public shows posts | pass | `/:username` route hits `fetchProfile({ username })` → API returns `isOwner:false`. ProfilePage guards Settings button on `isOwner &&`. Public user + viewer returns `postsRestricted:false`; grid renders. |
| AC3.rule — Non-owner NEVER sees email | pass | `user.controller.js` `sanitizeProfileResponse` — `email` is only set `if (isOwner)` block; delete `SENSITIVE_USER_FIELDS` afterwards. No non-owner code path sets email. |
| AC4.rule — Private user + non-follower → `postsRestricted:true` + `posts:[]` | pass | L84-97 in controller: `canSeePrivatePosts = isOwner || !isPrivate || isFollower`. If blocked, `postsForViewer=[]` and `postsRestricted=true`. Frontend `postsRestricted===true` renders `EmptyState("This account is private")`. |
| AC5.rule — Ownership uses `req.user.sub` vs `_id` | pass | `sanitizeProfileResponse` L57-62: `viewer.sub` ObjectId vs `ownerId`. `editProfile` L387-394: explicit `isOwner===false` returns 403. `getMe` also requires token via `isAuth`. |
| AC6.rule — Mobile <1024px no Settings button; 3-line sheet has Settings row | pass | Desktop Settings button wrapper has `hidden lg:block`; sheet mobile-only `fixed lg:hidden`. Sheet row `Settings` L881-L891. |
| AC7.rule — Desktop ≥1024px shows Settings top-right for owner | pass | `hidden lg:block` banner wrapper; `isOwner &&` guards button. |
| AC8.rule — Desktop tabs Posts/Photos/Videos (no Likes); Mobile Posts/Videos (no Tagged) | pass | `DESKTOP_TABS` L117-L121 has 3 ids: posts/photos/videos. `MOBILE_TABS` L123-L126 has 2: posts/videos. Renders only these arrays via `.map`. |
| AC9.rule — Profile tab → navigate `/me` | pass | `home.jsx` L14-L22 `handleTabChange` dispatches `navigate("/me")` on `id==="profile"`. Also `profile.jsx` LeftCornerNav onChange also routes `/me` for profile. |
| AC10.rule — Routes under MainLayout → nav chrome visible | pass | `router.jsx` L13-L20 both `/me` + `/:username` inside MainLayout children (which renders `<Outlet />`). ProfilePage renders `<LeftCornerNav />` + `<MobileTopNav />` same as HomePage. |
| AC11.rule — No sensitive fields in any API response | pass | `SENSITIVE_USER_FIELDS` list (L16-L24) in sanitize: `password, tokenVersion, resetPasswordToken, resetPasswordTokenExpire, emailVerificationToken, emailVerificationExpireAt, __v` → all `delete` before returning. Populated posts only expose `_id author mediaType media caption like comment likesCount commentsCount createdAt` via select. |
| AC12.rule — `/me` unauth redirect login | pass | `profile.jsx` L172-L180 `if (isMe && !hasToken)` → `dispatch(clearAuth())` + `navigate('/login', {replace:true})`. |

#### Rubric ACs — Self-evaluation

| AC | Score | Threshold | Rationale | Evidence |
|---|---|---|---|---|
| AC13.rubric — Design fidelity vs refs | 3/3 | ≥2 | Desktop: banner strip, overlapping ringed avatar, name/verified/@handle, bio above "Followers / Posts" 2-col stats card, tabs 3 with count pills, post cards with thumbnail + author footer + like/comment counts. Mobile: top bar back + label + plus + menu, 3 stats (Posts/Followers/Following), name/bio/CTAs, 2 tabs, 3-col grid. Settings positions exactly per yellow highlight (desktop top-right yellow pill; mobile menu sheet Settings row). | profile.jsx L253-L655. |
| AC14.rubric — Responsive behavior across widths | 3/3 | ≥2 | `<lg`: banner/header/tabs hidden; MobileTopNav + custom top bar; `grid-cols-3` thumbnails. `≥lg`: desktop banner/overlap/header/tabs; `lg:pl-[72px] xl:pl-[84px]` matches HomePage. Max widths `max-w-[1200px]`, inner post cards responsive. No horizontal overflow due to responsive wrappers. | profile.jsx responsive class branches; HomePage parity in page-level padding. |
| AC15.rubric — Code consistency with existing patterns | 3/3 | ≥2 | Backend: try/catch controllers, `{status, message, data:{user}}` envelope matches auth.controller; Zod validation reuse via existing editProfileSchema; optionalAuth middleware matches existing isAuth jwt.verify style. Frontend: `createAsyncThunk` in profileSlice (mirrors authSlice), `cn` utility, lucide icons, `useTheme` + dark/light logo assets, designSystem tokens for colors/radius/shadow, `cn` + motion tokens, `formatCount` K/M utility matches social media norms. | user.controller.js, profileSlice.js, profile.jsx. |
| AC16.rubric — Layered security (backend ownership + post restriction + graceful FE state) | 3/3 | ≥2 | Layer 1: editProfile 403 if not owner + token required. Layer 2: email only if owner; gender only if public or follower. Layer 3: `isPrivate && !canSeePrivatePosts` → zero posts returned + `postsRestricted:true`. Layer 4: frontend restricted EmptyState instead of empty grid. Layer 5: sensitive fields scrubbed via explicit delete list. | user.controller.js `sanitizeProfileResponse` + frontend conditional rendering of restricted/empty/error states. |

#### Remaining findings (non-blocking advisory)

- [INFO] Frontend `profile.jsx` `visiblePosts` filter uses `mediaType==='video'` filter but `PostCard` demo `likesCount`/`commentsCount` falls back to random mock because existing Post schema doesn't define like/comment arrays — acceptable per spec "demo click targets only".
- [INFO] `vite build` warns 500KB chunk size — advisory, not acceptance-blocking; app worked at previous size too.

#### Cycle 1 Result

**Result: pass** — Every required rule AC has observable pass evidence; every rubric meets ≥2 threshold. No actionable fixes required before completion.
