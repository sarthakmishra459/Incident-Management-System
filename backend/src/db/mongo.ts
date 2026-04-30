import { MongoClient } from "mongodb";
import { env } from "../config/env.js";

export const mongoClient = new MongoClient(env.MONGO_URL, {
  maxPoolSize: 100,
  minPoolSize: 5
});

let connected = false;

export async function mongoDb() {
  if (!connected) {
    await mongoClient.connect();
    connected = true;
  }
  return mongoClient.db("ims");
}
