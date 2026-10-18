# Story API Documentation

This document describes all backend API endpoints for the **Story Feature** in Threadgram. All endpoints are mounted at `/api/stories` and require JWT Authentication via HTTP cookies or Authorization header.

---

## 1. Authentication & Base URL

- **Base URL**: `/api/stories`
- **Auth Middleware**: `isAuth` (Requires valid user session/JWT token)
- **Content-Type**: `application/json` (except story upload which uses `multipart/form-data`)

---

## 2. API Endpoints Reference

### 2.1 Get Feed Stories
- **Endpoint**: `GET /api/stories/feed`
- **Auth**: Required
- **Description**: Retrieves active 24-hour stories grouped by user for the logged-in user and accounts they follow with `accepted` status.
- **Query Params**: None
- **Response `200 OK`**:
```json
{
  "status": "success",
  "data": {
    "storyGroups": [
      {
        "user": {
          "_id": "60d5ec49f1b2c811284e0111",
          "name": "Danish Irtiza",
          "username": "danirt0",
          "avatar": "https://res.cloudinary.com/.../avatar.jpg",
          "isPrivate": false
        },
        "stories": [
          {
            "_id": "60d5ec49f1b2c811284e0999",
            "author": "60d5ec49f1b2c811284e0111",
            "mediaType": "image",
            "media": "https://res.cloudinary.com/.../story.jpg",
            "viewers": ["60d5ec49f1b2c811284e0222"],
            "like": ["60d5ec49f1b2c811284e0222"],
            "isViewed": true,
            "isLiked": false,
            "viewsCount": 1,
            "likesCount": 1,
            "createdAt": "2026-10-04T18:00:00.000Z"
          }
        ],
        "hasUnseen": false
      }
    ]
  }
}
```
- **Sorting Logic**: Logged-in user's story group is returned FIRST, followed by groups with unseen stories, followed by fully viewed groups.

---

### 2.2 Get User Stories
- **Endpoint**: `GET /api/stories/user/:userId`
- **Auth**: Required
- **Description**: Retrieves active 24-hour stories for a specific user.
- **Path Params**:
  - `userId`: `ObjectId` of the target user
- **Access Control**:
  - Author can always view their own stories.
  - Public profile: anyone can view stories.
  - Private profile: viewer MUST be an accepted follower (`status: "accepted"`). Returns `403 Forbidden` if not followed.
- **Response `200 OK`**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "60d5ec49f1b2c811284e0111",
      "name": "Danish Irtiza",
      "username": "danirt0",
      "avatar": "https://res.cloudinary.com/.../avatar.jpg",
      "isPrivate": false
    },
    "stories": [
      {
        "_id": "60d5ec49f1b2c811284e0999",
        "mediaType": "video",
        "media": "https://res.cloudinary.com/.../story.mp4",
        "isViewed": false,
        "isLiked": false,
        "viewsCount": 3,
        "likesCount": 2,
        "createdAt": "2026-10-04T19:30:00.000Z"
      }
    ]
  }
}
```
- **Response `403 Forbidden`**:
```json
{
  "status": "fail",
  "message": "This account is private. Follow this account to see their stories."
}
```

---

### 2.3 Create Story
- **Endpoint**: `POST /api/stories`
- **Auth**: Required
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `media`: File (Image or Video file, required)
- **Response `201 Created`**:
```json
{
  "status": "success",
  "message": "Story created successfully",
  "data": {
    "story": {
      "_id": "60d5ec49f1b2c811284e0999",
      "author": {
        "_id": "60d5ec49f1b2c811284e0111",
        "name": "Danish Irtiza",
        "username": "danirt0",
        "avatar": "https://res.cloudinary.com/.../avatar.jpg"
      },
      "mediaType": "image",
      "media": "https://res.cloudinary.com/.../uploaded_story.jpg",
      "viewers": [],
      "like": [],
      "createdAt": "2026-10-04T21:00:00.000Z"
    }
  }
}
```

---

### 2.4 Mark Story as Viewed
- **Endpoint**: `POST /api/stories/:storyId/view`
- **Auth**: Required
- **Path Params**:
  - `storyId`: `ObjectId` of the target story
- **View Count Rule**:
  - If viewer is the story author (`author === userId`), the backend DOES NOT add the author to `viewers` array. Self-views are excluded from view counts.
- **Response `200 OK`**:
```json
{
  "status": "success",
  "message": "Story marked as viewed"
}
```

---

### 2.5 Toggle Like Story
- **Endpoint**: `POST /api/stories/:storyId/like`
- **Auth**: Required
- **Path Params**:
  - `storyId`: `ObjectId` of the target story
- **Response `200 OK`**:
```json
{
  "status": "success",
  "message": "Story liked",
  "isLiked": true,
  "likesCount": 5
}
```

---

### 2.6 Get Story Viewers (Author Only)
- **Endpoint**: `GET /api/stories/:storyId/viewers`
- **Auth**: Required
- **Path Params**:
  - `storyId`: `ObjectId` of the target story
- **Access Control**: Author ONLY. Returns `403 Forbidden` if accessed by non-author.
- **Response `200 OK`**:
```json
{
  "status": "success",
  "data": {
    "viewers": [
      {
        "_id": "60d5ec49f1b2c811284e0222",
        "name": "Ayush Sahu",
        "username": "theayushsahu_",
        "avatar": "https://res.cloudinary.com/.../avatar2.jpg",
        "hasLiked": true
      }
    ],
    "totalViewers": 1,
    "totalLikes": 1
  }
}
```

---

### 2.7 Delete Story (Author Only)
- **Endpoint**: `DELETE /api/stories/:storyId`
- **Auth**: Required
- **Path Params**:
  - `storyId`: `ObjectId` of the target story
- **Access Control**: Author ONLY.
- **Response `200 OK`**:
```json
{
  "status": "success",
  "message": "Story deleted successfully"
}
```

---

## 3. Related User API Endpoint Enhancement (Profile Picture Removal)

- **Endpoint**: `POST /api/users/edit-profile`
- **Auth**: Required
- **Enhancement**: Support `removeAvatar: true` in body to set `user.avatar = ""` when removing current profile picture.
- **Response `200 OK`**:
```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": { "user": { "...": "..." } }
}
```
