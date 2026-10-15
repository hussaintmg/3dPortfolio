import mongoose from "mongoose";
import dns from "dns";

// Windows dev machines sometimes fail mongodb+srv DNS lookups
// (querySrv ECONNREFUSED). Opt-in fix via .env.local; never set on Vercel.
if (process.env.MONGODB_DNS_FIX === "true") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {}
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/portfolio";

if (!MONGODB_URI && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    // Reset so the next request can retry instead of replaying this failure
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
