// ─────────────────────────────────────────────────────────────────────
// CommentDesk storage layer
//
// Primary store : MongoDB Atlas (via the official `mongodb` driver).
// Fallback      : a local JSON file (data/comments.json). If the MongoDB
//                 URI is missing/invalid (e.g. the <db_password> placeholder
//                 has not been replaced yet) the app keeps working so the
//                 dashboard and API remain fully testable.
// ─────────────────────────────────────────────────────────────────────

import { MongoClient, ObjectId } from "mongodb";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "comments.json");
const ENGAGE_FILE = path.join(DATA_DIR, "engagement.json");
const COLLECTION = "comments";
const LIKES_COLLECTION = "likes"; // schema: { websiteUrl, websiteName, likes, dislikes, createdAt, updatedAt }
const VIEWS_COLLECTION = "views"; // schema: { websiteUrl, websiteName, count, lastViewedAt, createdAt }

// ── Mongo connection (attempted once per process) ────────────────────
let mongoState = { attempted: false, db: null };

async function tryMongo() {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri) throw new Error("MONGODB_URI is not configured");

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 6000,
    connectTimeoutMS: 10000,
  });
  await client.connect();

  const db = client.db((process.env.MONGODB_DB || "commentdesk").trim());
  await db.command({ ping: 1 });

  await Promise.allSettled([
    db.collection(COLLECTION).createIndex({ websiteUrl: 1, createdAt: -1 }),
    db.collection(COLLECTION).createIndex({ createdAt: -1 }),
    db.collection(COLLECTION).createIndex({ email: 1 }),
  ]);

  return db;
}

async function getDb() {
  if (mongoState.attempted) return mongoState.db;
  mongoState.attempted = true;
  try {
    mongoState.db = await tryMongo();
    console.log("[commentdesk] connected to MongoDB");
  } catch (err) {
    mongoState.db = null;
    console.warn(
      `[commentdesk] MongoDB unavailable (${err.message}). ` +
        `Falling back to local file store at ${DATA_FILE}`
    );
  }
  return mongoState.db;
}

export async function getStoreInfo() {
  const db = await getDb();
  return db
    ? { mode: "mongodb", label: "MongoDB Atlas" }
    : { mode: "local", label: "Local file store" };
}

// ── Helpers ──────────────────────────────────────────────────────────
export function deriveWebsiteName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "unknown-site").slice(0, 60);
  }
}

export function serialize(doc) {
  return {
    id: doc._id ? String(doc._id) : doc.id,
    name: doc.name,
    email: doc.email,
    message: doc.message,
    websiteUrl: doc.websiteUrl,
    websiteName: doc.websiteName || deriveWebsiteName(doc.websiteUrl),
    ip: doc.ip || null,
    userAgent: doc.userAgent || null,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

// ── Local file store (fallback) ──────────────────────────────────────
function seedLocal() {
  const now = Date.now();
  const H = 3600e3;
  const D = 24 * H;
  return [
    {
      id: crypto.randomUUID(),
      name: "Aarav Mehta",
      email: "aarav.mehta@gmail.com",
      message:
        "Hey Vishal! Just went through your portfolio — the project case studies are really well written. Would love to collaborate on a Next.js project sometime.",
      websiteUrl: "https://vishal-builds.vercel.app",
      websiteName: "vishal-builds.vercel.app",
      ip: "103.21.44.18",
      userAgent: "Chrome/126 (Windows)",
      createdAt: new Date(now - 2 * H).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "Sofia Bennett",
      email: "sofia.bennett@outlook.com",
      message:
        "The dark mode toggle on the homepage is such a nice touch. One suggestion — the contact form could remember my details between visits.",
      websiteUrl: "https://vishal-builds.vercel.app",
      websiteName: "vishal-builds.vercel.app",
      ip: "72.229.10.6",
      userAgent: "Safari/17.5 (macOS)",
      createdAt: new Date(now - 26 * H).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "Rohan Khanna",
      email: "rohan.k94@gmail.com",
      message:
        "Great write-up on server components. Could you do a follow-up article about streaming SSR with Suspense boundaries?",
      websiteUrl: "https://devbytes-techblog.hashnode.dev",
      websiteName: "devbytes-techblog.hashnode.dev",
      ip: "49.207.180.42",
      userAgent: "Firefox/127 (Linux)",
      createdAt: new Date(now - 5 * H).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "Priya Nair",
      email: "priya.nair@yahoo.in",
      message:
        "Your article on MongoDB indexing saved me hours of debugging. The explain() examples were gold. Subscribed!",
      websiteUrl: "https://devbytes-techblog.hashnode.dev",
      websiteName: "devbytes-techblog.hashnode.dev",
      ip: "117.96.33.201",
      userAgent: "Chrome/126 (Android)",
      createdAt: new Date(now - 2 * D).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "Daniel Carter",
      email: "dan.carter@proton.me",
      message:
        "Ordered the mechanical keyboard from your store last week — checkout was smooth. Any plans to add international shipping?",
      websiteUrl: "https://shopease-store.netlify.app",
      websiteName: "shopease-store.netlify.app",
      ip: "84.17.55.90",
      userAgent: "Chrome/126 (macOS)",
      createdAt: new Date(now - 7 * D).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "Ananya Iyer",
      email: "ananya.iyer.work@gmail.com",
      message:
        "The size guide on product pages is super helpful. Would be great if reviews had photo uploads too!",
      websiteUrl: "https://shopease-store.netlify.app",
      websiteName: "shopease-store.netlify.app",
      ip: "182.68.14.77",
      userAgent: "Safari/17.4 (iOS)",
      createdAt: new Date(now - 30 * D).toISOString(),
    },
  ];
}

async function readLocal() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn("[commentdesk] local store unreadable, reseeding:", err.message);
    }
    const seeded = seedLocal();
    await writeLocal(seeded);
    return seeded;
  }
}

async function writeLocal(docs) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(docs, null, 2), "utf8");
}

// ── Public API used by route handlers ───────────────────────────────

/** Insert a new comment/message. Always stamped server-side with the current time. */
export async function insertComment(input) {
  const db = await getDb();
  const websiteName = (input.websiteName || "").trim() || deriveWebsiteName(input.websiteUrl);

  if (db) {
    const doc = {
      name: input.name,
      email: input.email,
      message: input.message,
      websiteUrl: input.websiteUrl,
      websiteName,
      ip: input.ip || null,
      userAgent: input.userAgent || null,
      createdAt: new Date(), // current server time
    };
    const res = await db.collection(COLLECTION).insertOne(doc);
    return serialize({ ...doc, _id: res.insertedId });
  }

  const docs = await readLocal();
  const localDoc = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    message: input.message,
    websiteUrl: input.websiteUrl,
    websiteName,
    ip: input.ip || null,
    userAgent: input.userAgent || null,
    createdAt: new Date().toISOString(),
  };
  docs.unshift(localDoc);
  await writeLocal(docs);
  return serialize(localDoc);
}

/** List comments, newest first. Pass a websiteUrl to filter by site. */
export async function listComments({ websiteUrl, limit = 500 } = {}) {
  const db = await getDb();
  if (db) {
    const query = {};
    if (websiteUrl && websiteUrl !== "all") query.websiteUrl = websiteUrl;
    const docs = await db
      .collection(COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(serialize);
  }

  const docs = await readLocal();
  return docs
    .filter((d) => !websiteUrl || websiteUrl === "all" || d.websiteUrl === websiteUrl)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .map(serialize);
}

/** Aggregate: one row per website with comment/like/dislike/view counts + latest activity. */
export async function listWebsites() {
  const db = await getDb();
  const map = new Map();

  // Helper to upsert/merge a website row
  const upsert = (url, data) => {
    if (!map.has(url)) {
      map.set(url, {
        websiteUrl: url,
        websiteName: deriveWebsiteName(url),
        count: 0,
        likes: 0,
        dislikes: 0,
        views: 0,
        lastCommentAt: null,
        lastCommenter: null,
        _hasComment: false,
        _commentTs: 0,
      });
    }
    const row = map.get(url);
    if (data.websiteName) row.websiteName = data.websiteName;
    if (data.count !== undefined) row.count = data.count;
    if (data.likes !== undefined) row.likes = data.likes;
    if (data.dislikes !== undefined) row.dislikes = data.dislikes;
    if (data.views !== undefined) row.views = data.views;
    if (data.lastCommentAt) {
      const ts = new Date(data.lastCommentAt).getTime();
      if (ts > row._commentTs) {
        row._commentTs = ts;
        row.lastCommentAt = data.lastCommentAt;
        if (data.lastCommenter) row.lastCommenter = data.lastCommenter;
      }
      row._hasComment = true;
    }
  };

  if (db) {
    // Aggregate comments
    const commentAgg = await db
      .collection(COLLECTION)
      .aggregate([
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$websiteUrl",
            count: { $sum: 1 },
            websiteName: { $first: "$websiteName" },
            lastCommentAt: { $first: "$createdAt" },
            lastCommenter: { $first: "$name" },
          },
        },
      ])
      .toArray();

    // Fetch likes and views
    const [likesRows, viewsRows] = await Promise.all([
      db.collection(LIKES_COLLECTION).find({}).toArray(),
      db.collection(VIEWS_COLLECTION).find({}).toArray(),
    ]);

    // Merge views
    for (const v of viewsRows) {
      upsert(v.websiteUrl, {
        websiteName: v.websiteName,
        views: v.count || 0,
      });
    }

    // Merge likes
    for (const l of likesRows) {
      upsert(l.websiteUrl, {
        websiteName: l.websiteName,
        likes: l.likes || 0,
        dislikes: l.dislikes || 0,
      });
    }

    // Merge comments (overwrites websiteName if present)
    for (const c of commentAgg) {
      upsert(c._id, {
        websiteName: c.websiteName,
        count: c.count,
        lastCommentAt: c.lastCommentAt ? new Date(c.lastCommentAt).toISOString() : null,
        lastCommenter: c.lastCommenter,
      });
    }
  } else {
    // Local fallback: merge from file stores
    const docs = await readLocal();
    const engagement = await readEngagement();

    // Merge views
    for (const v of engagement.views) {
      upsert(v.websiteUrl, {
        websiteName: v.websiteName,
        views: v.count || 0,
      });
    }

    // Merge likes
    for (const l of engagement.likes) {
      upsert(l.websiteUrl, {
        websiteName: l.websiteName,
        likes: l.likes || 0,
        dislikes: l.dislikes || 0,
      });
    }

    // Merge comments
    for (const d of docs) {
      const cur = map.get(d.websiteUrl);
      upsert(d.websiteUrl, {
        websiteName: d.websiteName,
        count: (cur?.count || 0) + 1,
        lastCommentAt: d.createdAt,
        lastCommenter: d.name,
      });
    }
  }

  // Sort: sites with comments first (by lastCommentAt desc), then by views desc
  return [...map.values()]
    .map(({ _hasComment, _commentTs, ...rest }) => rest)
    .sort((a, b) => {
      // Prioritize sites with comments
      if (a.lastCommentAt && !b.lastCommentAt) return -1;
      if (!a.lastCommentAt && b.lastCommentAt) return 1;
      // Both have comments: sort by recency
      if (a.lastCommentAt && b.lastCommentAt) {
        return new Date(b.lastCommentAt).getTime() - new Date(a.lastCommentAt).getTime();
      }
      // Neither has comments: sort by views desc
      return (b.views || 0) - (a.views || 0);
    });
}

/** Fetch a single comment by id (accepts Mongo ObjectId or local UUID string). */
export async function getCommentById(id) {
  const db = await getDb();
  if (db) {
    if (!ObjectId.isValid(id)) return null;
    const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
    return doc ? serialize(doc) : null;
  }
  const docs = await readLocal();
  const doc = docs.find((d) => d.id === id);
  return doc ? serialize(doc) : null;
}

/** Delete a comment by id. Returns true when a document was removed. */
export async function deleteComment(id) {
  const db = await getDb();
  if (db) {
    if (!ObjectId.isValid(id)) return false;
    const res = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
    return res.deletedCount === 1;
  }
  const docs = await readLocal();
  const next = docs.filter((d) => d.id !== id);
  if (next.length === docs.length) return false;
  await writeLocal(next);
  return true;
}

// ─────────────────────────────────────────────────────────────────────
// Engagement schemas — likes/dislikes + page views
// One counter document per website. Incremented by the public (api-key
// protected) POST endpoints. Read by the public GET endpoints.
// ─────────────────────────────────────────────────────────────────────

function seedEngagement() {
  const now = new Date().toISOString();
  return {
    likes: [
      { id: crypto.randomUUID(), websiteUrl: "https://vishal-builds.vercel.app", websiteName: "vishal-builds.vercel.app", likes: 184, dislikes: 6, createdAt: now, updatedAt: now },
      { id: crypto.randomUUID(), websiteUrl: "https://devbytes-techblog.hashnode.dev", websiteName: "devbytes-techblog.hashnode.dev", likes: 421, dislikes: 19, createdAt: now, updatedAt: now },
      { id: crypto.randomUUID(), websiteUrl: "https://shopease-store.netlify.app", websiteName: "shopease-store.netlify.app", likes: 97, dislikes: 12, createdAt: now, updatedAt: now },
    ],
    views: [
      { id: crypto.randomUUID(), websiteUrl: "https://vishal-builds.vercel.app", websiteName: "vishal-builds.vercel.app", count: 5230, lastViewedAt: now, createdAt: now },
      { id: crypto.randomUUID(), websiteUrl: "https://devbytes-techblog.hashnode.dev", websiteName: "devbytes-techblog.hashnode.dev", count: 12884, lastViewedAt: now, createdAt: now },
      { id: crypto.randomUUID(), websiteUrl: "https://shopease-store.netlify.app", websiteName: "shopease-store.netlify.app", count: 3176, lastViewedAt: now, createdAt: now },
    ],
  };
}

async function readEngagement() {
  try {
    const raw = await fs.readFile(ENGAGE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return { likes: parsed.likes || [], views: parsed.views || [] };
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn("[commentdesk] engagement store unreadable, reseeding:", err.message);
    }
    const seeded = seedEngagement();
    await writeEngagement(seeded);
    return seeded;
  }
}

async function writeEngagement(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ENGAGE_FILE, JSON.stringify(data, null, 2), "utf8");
}

function serializeLike(doc) {
  return {
    id: doc._id ? String(doc._id) : doc.id,
    websiteUrl: doc.websiteUrl,
    websiteName: doc.websiteName || deriveWebsiteName(doc.websiteUrl),
    likes: Number(doc.likes) || 0,
    dislikes: Number(doc.dislikes) || 0,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

function serializeView(doc) {
  return {
    id: doc._id ? String(doc._id) : doc.id,
    websiteUrl: doc.websiteUrl,
    websiteName: doc.websiteName || deriveWebsiteName(doc.websiteUrl),
    count: Number(doc.count) || 0,
    lastViewedAt: doc.lastViewedAt ? new Date(doc.lastViewedAt).toISOString() : null,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

/**
 * Increment a like or dislike counter for a website (upserts the doc).
 * @param {{ websiteUrl, websiteName?, type: "like"|"dislike", amount?: number }} input
 */
export async function recordLike(input) {
  const db = await getDb();
  const websiteName = (input.websiteName || "").trim() || deriveWebsiteName(input.websiteUrl);
  const amount = Math.max(1, Number(input.amount) || 1);
  const field = input.type === "dislike" ? "dislikes" : "likes";

  if (db) {
    // NOTE: likes/dislikes are created implicitly by $inc on first insert,
    // so they must NOT also appear in $setOnInsert (that would conflict).
    await db.collection(LIKES_COLLECTION).updateOne(
      { websiteUrl: input.websiteUrl },
      {
        $inc: { [field]: amount },
        $set: { websiteName, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    // re-read the (possibly just-created) doc to return accurate totals
    const doc = await db.collection(LIKES_COLLECTION).findOne({ websiteUrl: input.websiteUrl });
    return serializeLike(doc || { websiteUrl: input.websiteUrl, websiteName, likes: 0, dislikes: 0, createdAt: new Date(), updatedAt: new Date() });
  }

  const data = await readEngagement();
  let row = data.likes.find((l) => l.websiteUrl === input.websiteUrl);
  if (!row) {
    row = { id: crypto.randomUUID(), websiteUrl: input.websiteUrl, websiteName, likes: 0, dislikes: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.likes.push(row);
  }
  row.websiteName = websiteName;
  row[field] = (Number(row[field]) || 0) + amount;
  row.updatedAt = new Date().toISOString();
  await writeEngagement(data);
  return serializeLike(row);
}

/**
 * Increment the view counter for a website (upserts the doc).
 * @param {{ websiteUrl, websiteName?, amount?: number }} input
 */
export async function recordView(input) {
  const db = await getDb();
  const websiteName = (input.websiteName || "").trim() || deriveWebsiteName(input.websiteUrl);
  const amount = Math.max(1, Number(input.amount) || 1);

  if (db) {
    await db.collection(VIEWS_COLLECTION).updateOne(
      { websiteUrl: input.websiteUrl },
      {
        $inc: { count: amount },
        $set: { websiteName, lastViewedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    const doc = await db.collection(VIEWS_COLLECTION).findOne({ websiteUrl: input.websiteUrl });
    return serializeView(doc || { websiteUrl: input.websiteUrl, websiteName, count: amount, lastViewedAt: new Date(), createdAt: new Date() });
  }

  const data = await readEngagement();
  let row = data.views.find((v) => v.websiteUrl === input.websiteUrl);
  if (!row) {
    row = { id: crypto.randomUUID(), websiteUrl: input.websiteUrl, websiteName, count: 0, lastViewedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    data.views.push(row);
  }
  row.websiteName = websiteName;
  row.count = (Number(row.count) || 0) + amount;
  row.lastViewedAt = new Date().toISOString();
  await writeEngagement(data);
  return serializeView(row);
}

/** List like/dislike counters per website. Pass websiteUrl to filter. */
export async function listLikes({ websiteUrl } = {}) {
  const db = await getDb();
  if (db) {
    const query = websiteUrl ? { websiteUrl } : {};
    const docs = await db
      .collection(LIKES_COLLECTION)
      .find(query)
      .sort({ likes: -1 })
      .toArray();
    return docs.map(serializeLike);
  }
  const data = await readEngagement();
  return data.likes
    .filter((l) => !websiteUrl || l.websiteUrl === websiteUrl)
    .map(serializeLike)
    .sort((a, b) => b.likes - a.likes);
}

/** List view counters per website. Pass websiteUrl to filter. */
export async function listViews({ websiteUrl } = {}) {
  const db = await getDb();
  if (db) {
    const query = websiteUrl ? { websiteUrl } : {};
    const docs = await db
      .collection(VIEWS_COLLECTION)
      .find(query)
      .sort({ count: -1 })
      .toArray();
    return docs.map(serializeView);
  }
  const data = await readEngagement();
  return data.views
    .filter((v) => !websiteUrl || v.websiteUrl === websiteUrl)
    .map(serializeView)
    .sort((a, b) => b.count - a.count);
}
