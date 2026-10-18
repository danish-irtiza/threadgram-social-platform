# Story Feature Implementation Plan

## 1. Overview & Objectives
This plan outlines the complete frontend implementation of the **Story Feature** for Threadgram (MERN Social Media Web App), properly connecting the frontend to the existing backend Story APIs.

Key Goals:
- Deliver a seamless Story experience across **Home Feed**, **Profile Page**, **Header/Sidebar Navigations**, and **Full-Screen Story Viewer**.
- Implement a reusable **Profile Avatar & Story Options Component** (`ProfileAvatarOptionsModal`) used across 3-4 locations (Home feed, Profile header, Mobile top nav, Left corner nav).
- Enforce strict active vs. expired story ring logic (active 24h window).
- Enforce view-count rules (owner's own views are NEVER counted).
- Provide real-time viewer analytics & story management (delete story, like story, edit/remove profile picture).

---

## 2. Component Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                                  Threadgram App                                   |
+-----------------------------------------------------------------------------------+
                                          |
                +-------------------------+-------------------------+
                |                                                   |
      [ Home Page / Feed ]                                  [ Profile Page ]
                |                                                   |
        <HomeCenterColumn>                                   <ProfileHeader>
                |                                                   |
        <StoryFeedBar>                                   <ProfileAvatarOptions>
                |                                                   |
     +----------+----------+                                        |
     |                     |                                        |
<UserStoryItem>    <OtherStoryItem>                                 |
     |                     |                                        |
     +----------+----------+                                        |
                |                                                   |
                +-------------------------+-------------------------+
                                          |
                                          v
                      [ Reusable Profile Avatar Options Modal ]
                      - Option 1: View Active Story / Add Story
                      - Option 2: Edit Profile Picture
                      - Option 3: Remove Current Picture
                                          |
                                          v
                         [ Full-Screen Story Viewer Modal ]
                         - Progress bars per story (video/image)
                         - Author header (avatar, @username, time ago, exit X)
                         - Story media (video/image with autoplay)
                         - Bottom bar: Like button (viewer) or View Count button (owner)
                         - Real-Time Viewers List Sheet (owner only)
```

---

## 3. Detailed Workflow & Feature Specifications

### 3.1 Home Page Story Bar (`StoryFeedBar`)
- Fetches active story groups via `GET /api/stories/feed` via Redux `storySlice`.
- **Your Story Item**:
  - Displays logged-in user's avatar.
  - If user has active stories: renders a theme-colored gradient ring (`bg-gradient-to-br from-indigo via-pink to-yellow`). Clicking opens your active stories in `<StoryViewerModal>`.
  - If user has NO active stories: renders normal avatar with a blue `+` badge overlay. Clicking opens `<CreateContentModal defaultType="story">`.
- **Other Users' Story Items**:
  - Rendered in horizontal scrollable row.
  - Unseen stories: colorful theme gradient ring.
  - Seen stories (all stories in group viewed): subtle gray border (`ring-1 ring-border opacity-70`).
  - Clicking opens `<StoryViewerModal>` starting at the user's first unseen story.

### 3.2 Profile Page Story Integration (`ProfilePage`)
- **Avatar Ring**:
  - Fetches target user's stories via `GET /api/stories/user/:userId`.
  - If user has active stories (within 24h): displays the theme-colored circular gradient ring around the profile avatar.
  - If no active stories: displays standard profile avatar.
- **Profile Avatar Click Action**:
  - Clicking the profile avatar opens the reusable `<ProfileAvatarOptionsModal>`.

### 3.3 Reusable Profile Avatar & Story Options Component (`ProfileAvatarOptionsModal`)
Reused across 4 locations:
1. Profile Page avatar click
2. Home Story Bar "Your Story" (long press/click options)
3. Mobile Top Nav avatar
4. Left Corner Nav avatar

Options:
- **Option 1: View Story / Add Story**
  - If active story exists: "View Story" -> opens `<StoryViewerModal>`.
  - If no active story: "Add Story" -> opens `<CreateContentModal defaultType="story">`.
- **Option 2: Edit Profile Picture**
  - Triggers hidden file input -> uploads new avatar via `POST /api/users/edit-profile` (multipart `avatar`).
- **Option 3: Remove Current Picture** (only shown if `user.avatar` exists)
  - Sends `removeAvatar: true` to `POST /api/users/edit-profile` -> sets `user.avatar = ""` and updates Redux auth & profile state.

### 3.4 Full-Screen Story Viewer (`StoryViewerModal`)
Matching mockups (`media_1791176722055` & `media_1791176739985`):
- **Top Bar**:
  - Segmented progress bar (one bar per story in current group). Active bar fills second-by-second (5s for images, actual video duration for video).
  - Header: Author avatar + `@username` (clickable to navigate to profile) + timestamp (`3s`, `30m`, `3h` ago) + Exit `X` button.
- **Media Player**:
  - Image: 5s timer with progress bar.
  - Video: `playsInline`, `autoPlay`, `muted={false}`, progress tracks video `currentTime / duration`.
  - Left screen tap -> previous story / previous user.
  - Right screen tap -> next story / next user.
- **View Marking & View Count Rule**:
  - When non-owner views story, sends `POST /api/stories/:storyId/view`.
  - Backend ignores self-view.
  - Frontend displays `story.viewsCount` (only viewers from other accounts).
- **Owner Viewers Sheet**:
  - If logged-in user is story owner: displays bottom-left view count button (`Eye` icon + total views count, e.g. `50 views`).
  - Clicking view count opens `<StoryViewersSheet>`:
    - Lists viewers fetched from `GET /api/stories/:storyId/viewers`.
    - Each row displays viewer avatar, username, name, and timestamp.
    - Owner can also delete story via `DELETE /api/stories/:storyId`.
- **Viewer Like Action**:
  - If viewer is NOT owner: displays `Heart` icon bottom-right to toggle story like (`POST /api/stories/:storyId/like`).

---

## 4. State Management (Redux `storySlice.js`)

A dedicated Redux slice `storySlice.js` will manage:
- `feedStoryGroups`: Array of grouped stories for feed.
- `userStories`: Map of `userId -> storyGroup` for profile & user story lookups.
- `activeStoryViewer`: `{ isOpen, storyGroupIndex, storyIndex, viewerUserId }`.
- `loading`: State indicators for fetching, creating, deleting, viewing.
- Async Thunks:
  - `fetchFeedStories` -> `GET /api/stories/feed`
  - `fetchUserStories(userId)` -> `GET /api/stories/user/:userId`
  - `markStoryViewed(storyId)` -> `POST /api/stories/:storyId/view`
  - `toggleLikeStory(storyId)` -> `POST /api/stories/:storyId/like`
  - `deleteStory(storyId)` -> `DELETE /api/stories/:storyId`
  - `fetchStoryViewers(storyId)` -> `GET /api/stories/:storyId/viewers`

---

## 5. Backend Modifications (Minor Enhancements)

To fully support "Remove Current Picture" from the Profile Avatar Options component:
- Update `user.controller.js` `editProfile`: Add support for `removeAvatar: true` / `req.body.removeAvatar` to clear `user.avatar = ""`.
- Update `auth.validators.js` `editProfileSchema`: Add `removeAvatar: z.union([z.boolean(), z.string()]).optional()`.

---

## 6. Edge Cases & Testing Protocol

1. **Active vs Expired Stories**:
   - Verify stories older than 24h are hidden and do not show active story ring.
2. **Self View Count Exclusion**:
   - Verify owner viewing their own story does not increment `viewsCount`.
3. **Story Autoplay & Transition**:
   - Video finishes -> auto-advances to next story.
   - Image 5s timer finishes -> auto-advances to next story.
4. **Avatar Options Sheet**:
   - Upload new profile picture -> updates avatar instantly across header, sidebar, profile, and story rings.
   - Remove profile picture -> fallback initials rendered correctly.
5. **Private Account Visibility**:
   - Verify non-followers cannot access private account stories.
