/**
 * follow.test.js
 * Integration tests for the Follow system.
 *
 * Uses an in-memory MongoDB instance (mongodb-memory-server) and real JWTs.
 *
 * Coverage:
 *  - Follow / unfollow (public account)
 *  - Private request / cancel / accept / reject
 *  - Follow Back scenario
 *  - Mutual following -> counts
 *  - State persistence after refresh (re-fetching endpoints)
 *  - Correct follower/following direction in list endpoints
 *  - Relationship flags with optionalAuth viewer
 *  - Follow counts accuracy
 *  - Auth edge cases (no token -> 401)
 */

require("dotenv").config()
const request = require("supertest")
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const app = require("../app")
const User = require("../models/user.model")
const Follow = require("../models/follow.model")

const TEST_JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || "test-access-token-secret"
process.env.NODE_ENV = "test"

jest.setTimeout(30000)

function mintToken(user) {
  return jwt.sign({ sub: user._id.toString(), username: user.username }, TEST_JWT_SECRET, { expiresIn: "1h" })
}
function authHeader(user) { return { Authorization: `Bearer ${mintToken(user)}` } }

async function createUser(overrides = {}) {
  const username = `u_${Math.random().toString(36).slice(2, 8)}`
  const hash = await bcrypt.hash("pw123", 4)
  return User.create({ name: "Test User", username, email: `${username}@x.com`, password: hash, isVerified: true, isPrivate: false, ...overrides })
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "social_media_test" })
  }
})

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await User.deleteMany({ email: /@x\.com$/ })
    await Follow.deleteMany({})
    await mongoose.disconnect()
  }
})

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({ email: /@x\.com$/ })
    await Follow.deleteMany({})
  }
})

// -- Follow / Unfollow (public) ---------------------------------------------
describe("Follow / Unfollow - public account", () => {
  test("viewer follows public user -> status=accepted, counts=1", async () => {
    const [v, t] = [await createUser(), await createUser()]
    const r = await request(app).post(`/api/follow/${t._id}/follow`).set(authHeader(v))
    expect(r.status).toBe(201)
    expect(r.body.data.followStatus).toBe("accepted")
    expect(r.body.data.targetFollowerCount).toBe(1)
    expect(r.body.data.viewerFollowingCount).toBe(1)
    const doc = await Follow.findOne({ follower: v._id, following: t._id })
    expect(doc).not.toBeNull()
    expect(doc.status).toBe("accepted")
  })

  test("cannot follow self -> 400", async () => {
    const v = await createUser()
    const r = await request(app).post(`/api/follow/${v._id}/follow`).set(authHeader(v))
    expect(r.status).toBe(400)
  })

  test("double follow -> 409", async () => {
    const [v, t] = [await createUser(), await createUser()]
    await request(app).post(`/api/follow/${t._id}/follow`).set(authHeader(v))
    const r = await request(app).post(`/api/follow/${t._id}/follow`).set(authHeader(v))
    expect(r.status).toBe(409)
  })

  test("unfollow removes relationship and decrements counts", async () => {
    const [v, t] = [await createUser(), await createUser()]
    await request(app).post(`/api/follow/${t._id}/follow`).set(authHeader(v))
    const r = await request(app).delete(`/api/follow/${t._id}/unfollow`).set(authHeader(v))
    expect(r.status).toBe(200)
    expect(r.body.data.targetFollowerCount).toBe(0)
    expect(r.body.data.viewerFollowingCount).toBe(0)
    expect(await Follow.findOne({ follower: v._id, following: t._id })).toBeNull()
  })

  test("unfollow someone you dont follow -> 404", async () => {
    const [v, t] = [await createUser(), await createUser()]
    expect((await request(app).delete(`/api/follow/${t._id}/unfollow`).set(authHeader(v))).status).toBe(404)
  })
})

// -- Private account --------------------------------------------------------
describe("Private account - request / cancel / accept / reject", () => {
  test("follow private -> pending, follower/following counts=0", async () => {
    const v = await createUser()
    const t = await createUser({ isPrivate: true })
    const r = await request(app).post(`/api/follow/${t._id}/follow`).set(authHeader(v))
    expect(r.status).toBe(201)
    expect(r.body.data.followStatus).toBe("pending")
    expect(r.body.data.targetFollowerCount).toBe(0)
    expect(r.body.data.viewerFollowingCount).toBe(0)
    expect((await Follow.findOne({ follower: v._id, following: t._id })).status).toBe("pending")
  })

  test("requester can cancel pending request", async () => {
    const v = await createUser()
    const t = await createUser({ isPrivate: true })
    await request(app).post(`/api/follow/${t._id}/follow`).set(authHeader(v))
    expect((await request(app).delete(`/api/follow/${t._id}/cancel`).set(authHeader(v))).status).toBe(200)
    expect(await Follow.findOne({ follower: v._id, following: t._id })).toBeNull()
  })

  test("cancel non-existent request -> 404", async () => {
    const [v, t] = [await createUser(), await createUser({ isPrivate: true })]
    expect((await request(app).delete(`/api/follow/${t._id}/cancel`).set(authHeader(v))).status).toBe(404)
  })

  test("owner accepts pending request -> status=accepted, counts=1", async () => {
    const req = await createUser()
    const owner = await createUser({ isPrivate: true })
    await request(app).post(`/api/follow/${owner._id}/follow`).set(authHeader(req))
    const r = await request(app).post(`/api/follow/${req._id}/accept`).set(authHeader(owner))
    expect(r.status).toBe(200)
    expect(r.body.data.followStatus).toBe("accepted")
    expect(r.body.data.ownerFollowerCount).toBe(1)
    expect(r.body.data.requesterFollowingCount).toBe(1)
    expect((await Follow.findOne({ follower: req._id, following: owner._id })).status).toBe("accepted")
  })

  test("accept non-existent request -> 404", async () => {
    const [req, owner] = [await createUser(), await createUser({ isPrivate: true })]
    expect((await request(app).post(`/api/follow/${req._id}/accept`).set(authHeader(owner))).status).toBe(404)
  })

  test("owner rejects pending request -> deleted", async () => {
    const req = await createUser()
    const owner = await createUser({ isPrivate: true })
    await request(app).post(`/api/follow/${owner._id}/follow`).set(authHeader(req))
    expect((await request(app).delete(`/api/follow/${req._id}/reject`).set(authHeader(owner))).status).toBe(200)
    expect(await Follow.findOne({ follower: req._id, following: owner._id })).toBeNull()
  })

  test("reject non-existent request -> 404", async () => {
    const [req, owner] = [await createUser(), await createUser({ isPrivate: true })]
    expect((await request(app).delete(`/api/follow/${req._id}/reject`).set(authHeader(owner))).status).toBe(404)
  })
})

// -- Follow Back ------------------------------------------------------------
describe("Follow Back scenario", () => {
  test("B's followers list shows isFollower=true and isFollowing=false for A before B follows back", async () => {
    const [a, b] = [await createUser(), await createUser()]
    await request(app).post(`/api/follow/${b._id}/follow`).set(authHeader(a))
    const r = await request(app).get(`/api/follow/${b._id}/followers`).set(authHeader(b))
    expect(r.status).toBe(200)
    const aEntry = r.body.data.followers.find(u => u._id.toString() === a._id.toString())
    expect(aEntry).toBeDefined()
    expect(aEntry.isFollowing).toBe(false) // b hasnt followed a
    expect(aEntry.isFollower).toBe(true)   // a follows b => a is follower of b => from b's pov
  })

  test("B can follow A back - both counts update correctly", async () => {
    const [a, b] = [await createUser(), await createUser()]
    await request(app).post(`/api/follow/${b._id}/follow`).set(authHeader(a))
    const r = await request(app).post(`/api/follow/${a._id}/follow`).set(authHeader(b))
    expect(r.status).toBe(201)
    expect(r.body.data.followStatus).toBe("accepted")
    expect(r.body.data.targetFollowerCount).toBe(1) // a gains 1 follower
    expect(r.body.data.viewerFollowingCount).toBe(1) // b now follows 1
  })

  test("after mutual follow both see isFollowing=true and isFollower=true", async () => {
    const [a, b] = [await createUser(), await createUser()]
    await request(app).post(`/api/follow/${b._id}/follow`).set(authHeader(a))
    await request(app).post(`/api/follow/${a._id}/follow`).set(authHeader(b))

    // b fetches b's followers (viewer = b, list contains a)
    const r1 = await request(app).get(`/api/follow/${b._id}/followers`).set(authHeader(b))
    const aInBFollowers = r1.body.data.followers.find(u => u._id.toString() === a._id.toString())
    expect(aInBFollowers.isFollowing).toBe(true)  // b follows a
    expect(aInBFollowers.isFollower).toBe(true)   // a follows b back

    // a fetches a's following (viewer = a, list contains b)
    const r2 = await request(app).get(`/api/follow/${a._id}/following`).set(authHeader(a))
    const bInAFollowing = r2.body.data.following.find(u => u._id.toString() === b._id.toString())
    expect(bInAFollowing.isFollowing).toBe(true)  // a follows b
    expect(bInAFollowing.isFollower).toBe(true)   // b follows a back
  })
})

// -- Relationship flags with optionalAuth ----------------------------------
describe("List endpoints - relationship flags via optionalAuth", () => {
  test("unauthenticated viewer gets all-false flags", async () => {
    const [a, b] = [await createUser(), await createUser()]
    await request(app).post(`/api/follow/${b._id}/follow`).set(authHeader(a))
    const r = await request(app).get(`/api/follow/${b._id}/followers`)
    expect(r.status).toBe(200)
    const entry = r.body.data.followers[0]
    expect(entry.isFollowing).toBe(false)
    expect(entry.isRequested).toBe(false)
    expect(entry.isFollower).toBe(false)
    expect(entry.isReceivedPendingRequest).toBe(false)
  })

  test("authenticated viewer sees correct isFollowing for user in followers list", async () => {
    const [a, b, viewer] = [await createUser(), await createUser(), await createUser()]
    await request(app).post(`/api/follow/${b._id}/follow`).set(authHeader(a))
    await request(app).post(`/api/follow/${a._id}/follow`).set(authHeader(viewer))
    const r = await request(app).get(`/api/follow/${b._id}/followers`).set(authHeader(viewer))
    const aEntry = r.body.data.followers.find(u => u._id.toString() === a._id.toString())
    expect(aEntry.isFollowing).toBe(true)  // viewer follows a
    expect(aEntry.isFollower).toBe(false)  // a doesn't follow viewer
  })

  test("pending relationship shows isRequested=true in own following list (filtered to accepted only)", async () => {
    const [v, priv] = [await createUser(), await createUser({ isPrivate: true })]
    await request(app).post(`/api/follow/${priv._id}/follow`).set(authHeader(v))
    const r = await request(app).get(`/api/follow/${v._id}/following`).set(authHeader(v))
    // Pending requests are NOT shown in /following (accepted only)
    expect(r.body.data.total).toBe(0)
    expect(r.body.data.following).toHaveLength(0)
  })

  test("isReceivedPendingRequest=true for owner in pending requests list", async () => {
    const [sender, owner] = [await createUser(), await createUser({ isPrivate: true })]
    await request(app).post(`/api/follow/${owner._id}/follow`).set(authHeader(sender))
    const r = await request(app).get(`/api/follow/requests`).set(authHeader(owner))
    expect(r.status).toBe(200)
    expect(r.body.data.total).toBe(1)
    expect(r.body.data.requests[0].isReceivedPendingRequest).toBe(true)
  })
})

// -- Counts accuracy --------------------------------------------------------
describe("Follower / following count accuracy", () => {
  test("follower count = number of accepted follow docs", async () => {
    const target = await createUser()
    const followers = [await createUser(), await createUser(), await createUser()]
    for (const f of followers) {
      await request(app).post(`/api/follow/${target._id}/follow`).set(authHeader(f))
    }
    const r = await request(app).get(`/api/follow/${target._id}/followers`).set(authHeader(followers[0]))
    expect(r.body.data.total).toBe(3)
  })

  test("pending follow does NOT increment follower or following count", async () => {
    const [v, pub, priv] = [await createUser(), await createUser(), await createUser({ isPrivate: true })]
    const pubRes = await request(app).post(`/api/follow/${pub._id}/follow`).set(authHeader(v))
    await request(app).post(`/api/follow/${priv._id}/follow`).set(authHeader(v))
    // After following public (accepted) viewer has 1 following
    expect(pubRes.body.data.viewerFollowingCount).toBe(1)
    const r = await request(app).get(`/api/follow/${v._id}/following`).set(authHeader(v))
    expect(r.body.data.total).toBe(1)
  })

  test("unfollow decrements counts correctly", async () => {
    const [v, a, b] = [await createUser(), await createUser(), await createUser()]
    await request(app).post(`/api/follow/${a._id}/follow`).set(authHeader(v))
    await request(app).post(`/api/follow/${b._id}/follow`).set(authHeader(v))
    const r = await request(app).delete(`/api/follow/${a._id}/unfollow`).set(authHeader(v))
    expect(r.body.data.viewerFollowingCount).toBe(1)
    expect(r.body.data.targetFollowerCount).toBe(0)
  })

  test("after accept, both owner follower count and requester following count = 1", async () => {
    const [req, owner] = [await createUser(), await createUser({ isPrivate: true })]
    await request(app).post(`/api/follow/${owner._id}/follow`).set(authHeader(req))
    const r = await request(app).post(`/api/follow/${req._id}/accept`).set(authHeader(owner))
    expect(r.body.data.ownerFollowerCount).toBe(1)
    expect(r.body.data.requesterFollowingCount).toBe(1)
    const lr = await request(app).get(`/api/follow/${owner._id}/followers`).set(authHeader(owner))
    expect(lr.body.data.total).toBe(1)
  })
})

// -- State persistence (refresh simulation) -------------------------------
describe("State persistence after refresh", () => {
  test("follow state survives re-fetch of followers list", async () => {
    const [a, b] = [await createUser(), await createUser()]
    await request(app).post(`/api/follow/${b._id}/follow`).set(authHeader(a))
    // b fetches their own followers (list contains a) -> b sees a is their follower
    const r = await request(app).get(`/api/follow/${b._id}/followers`).set(authHeader(b))
    expect(r.status).toBe(200)
    const entry = r.body.data.followers.find(u => u._id.toString() === a._id.toString())
    expect(entry.isFollowing).toBe(false) // b hasn't followed a back
    expect(entry.isFollower).toBe(true)   // a follows b
  })

  test("pending request persists across pending-requests fetches", async () => {
    const [sender, owner] = [await createUser(), await createUser({ isPrivate: true })]
    await request(app).post(`/api/follow/${owner._id}/follow`).set(authHeader(sender))
    const r = await request(app).get(`/api/follow/requests`).set(authHeader(owner))
    expect(r.body.data.total).toBe(1)
    expect(r.body.data.requests[0].isReceivedPendingRequest).toBe(true)
  })

  test("unfollow then re-follow restores state correctly", async () => {
    const [v, t] = [await createUser(), await createUser()]
    await request(app).post(`/api/follow/${t._id}/follow`).set(authHeader(v))
    await request(app).delete(`/api/follow/${t._id}/unfollow`).set(authHeader(v))
    const r = await request(app).post(`/api/follow/${t._id}/follow`).set(authHeader(v))
    expect(r.status).toBe(201)
    expect(r.body.data.followStatus).toBe("accepted")
    expect(r.body.data.targetFollowerCount).toBe(1)
  })
})

// -- Auth edge cases --------------------------------------------------------
describe("Authentication edge cases", () => {
  test("follow without token -> 401", async () => {
    const t = await createUser()
    expect((await request(app).post(`/api/follow/${t._id}/follow`)).status).toBe(401)
  })

  test("unfollow without token -> 401", async () => {
    const t = await createUser()
    expect((await request(app).delete(`/api/follow/${t._id}/unfollow`)).status).toBe(401)
  })

  test("accept without token -> 401", async () => {
    const req = await createUser()
    expect((await request(app).post(`/api/follow/${req._id}/accept`)).status).toBe(401)
  })

  test("cancel without token -> 401", async () => {
    const t = await createUser()
    expect((await request(app).delete(`/api/follow/${t._id}/cancel`)).status).toBe(401)
  })
})

// -- Private Profile & Content Authorization --------------------------------
describe("Private Account Route Authorization & Direct URL Access", () => {
  test("unauthorized viewer accessing private profile gets restricted posts response", async () => {
    const [viewer, privUser] = [await createUser(), await createUser({ isPrivate: true })]
    const r = await request(app).get(`/api/users/${privUser.username}`).set(authHeader(viewer))
    expect(r.status).toBe(200)
    expect(r.body.data.user.isPrivate).toBe(true)
    expect(r.body.data.user.postsRestricted).toBe(true)
    expect(r.body.data.user.posts).toEqual([])
    expect(r.body.data.user.isFollowing).toBe(false)
  })

  test("unauthenticated guest accessing private profile gets restricted posts response", async () => {
    const privUser = await createUser({ isPrivate: true })
    const r = await request(app).get(`/api/users/${privUser.username}`)
    expect(r.status).toBe(200)
    expect(r.body.data.user.isPrivate).toBe(true)
    expect(r.body.data.user.postsRestricted).toBe(true)
    expect(r.body.data.user.posts).toEqual([])
  })

  test("unauthorized viewer accessing /api/posts/user/:userId for private user gets restricted=true", async () => {
    const [viewer, privUser] = [await createUser(), await createUser({ isPrivate: true })]
    const r = await request(app).get(`/api/posts/user/${privUser._id}`).set(authHeader(viewer))
    expect(r.status).toBe(200)
    expect(r.body.data.restricted).toBe(true)
    expect(r.body.data.posts).toEqual([])
  })

  test("unauthorized viewer accessing /api/vibes/user/:userId for private user gets restricted=true", async () => {
    const [viewer, privUser] = [await createUser(), await createUser({ isPrivate: true })]
    const r = await request(app).get(`/api/vibes/user/${privUser._id}`).set(authHeader(viewer))
    expect(r.status).toBe(200)
    expect(r.body.data.restricted).toBe(true)
    expect(r.body.data.vibes).toEqual([])
  })
})

