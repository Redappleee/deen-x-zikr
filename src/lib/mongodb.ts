import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is missing.");
  }

  if (!global.mongoClientPromise) {
    const client = new MongoClient(uri, {
      tls: true,
      family: 4,
      serverSelectionTimeoutMS: 15_000,
      connectTimeoutMS: 15_000,
      socketTimeoutMS: 20_000,
      maxPoolSize: 10
    });
    global.mongoClientPromise = client.connect().catch(async (error) => {
      // Avoid permanently caching a rejected connection promise.
      global.mongoClientPromise = undefined;
      await client.close().catch(() => undefined);
      throw error;
    });
  }

  return global.mongoClientPromise;
}
