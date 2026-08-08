import mongoose from "mongoose";
import dns from "dns";

// Windows dev machines sometimes fail mongodb+srv DNS lookups
// (querySrv ECONNREFUSED). Opt-in fix via .env.local; never set on Vercel.
if (process.env.MONGODB_DNS_FIX === "true") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {}
}

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
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
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
