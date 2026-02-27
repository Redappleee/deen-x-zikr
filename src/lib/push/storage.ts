import type { Collection } from "mongodb";
import { getMongoClientPromise } from "@/lib/mongodb";
import type { PushSubscriptionDoc } from "@/lib/push/types";

let indexesReady = false;

export async function getPushCollection(): Promise<Collection<PushSubscriptionDoc>> {
  const client = await getMongoClientPromise();
  const collection = client.db().collection<PushSubscriptionDoc>("pushSubscriptions");

  if (!indexesReady) {
    await collection.createIndex({ endpoint: 1 }, { unique: true });
    await collection.createIndex({ active: 1, updatedAt: -1 });
    indexesReady = true;
  }

  return collection;
}
