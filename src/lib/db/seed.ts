import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./index";
import { users } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  const email = process.env.INITIAL_EMAIL;
  const password = process.env.INITIAL_PASSWORD;
  if (!email || !password) {
    console.error("INITIAL_EMAIL and INITIAL_PASSWORD must be set");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .insert(users)
    .values({
      name: "Jessica Massimi",
      email,
      passwordHash,
    })
    .onConflictDoNothing();

  console.log(`Seeded user: Jessica Massimi (${email})`);
}

seed().catch(console.error);
