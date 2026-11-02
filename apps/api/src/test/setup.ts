import { beforeAll, afterAll, afterEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectMongo, disconnectMongo } from "../infrastructure/mongo.js";

// NODE_ENV=test and the other required env vars are set via vitest.config.ts's
// `test.env`, which vitest applies before any module (incl. config/env.ts) loads.

let mongod: MongoMemoryServer | undefined;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = `${mongod.getUri()}everypaper-test`;
  await connectMongo(uri);
}, 60_000);

afterEach(async () => {
  // Keep tests isolated from each other without paying for a full
  // reconnect between every test.
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await disconnectMongo();
  await mongod?.stop();
}, 30_000);
