"use server";

import { db } from "@/lib/db";
import { cases, documents } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { del } from "@vercel/blob";

export async function createCase(documentData: {
  blobUrl: string;
  filename: string;
  type: string;
  mimeType: string;
}[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [caseRecord] = await db.insert(cases).values({
    userId: session.user.id,
    name: null, // Auto-populated in Phase 3 per D-16
  }).returning();

  for (const doc of documentData) {
    await db.insert(documents).values({
      caseId: caseRecord.id,
      blobUrl: doc.blobUrl,
      filename: doc.filename,
      type: doc.type,
      mimeType: doc.mimeType,
    });
  }

  revalidatePath("/dashboard");
  return caseRecord;
}

export async function renameCase(caseId: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await db
    .update(cases)
    .set({ name, updatedAt: new Date() })
    .where(eq(cases.id, caseId));

  revalidatePath(`/case/${caseId}`);
  revalidatePath("/dashboard");
}

export async function deleteCase(caseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Fetch all documents to get blob URLs for cleanup
  const docs = await db.query.documents.findMany({
    where: eq(documents.caseId, caseId),
  });

  // Delete blobs from Vercel Blob
  if (docs.length > 0) {
    await del(docs.map((d) => d.blobUrl));
  }

  // Delete case (cascades to documents via schema)
  await db.delete(cases).where(eq(cases.id, caseId));

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function getCases() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  return db
    .select({
      id: cases.id,
      name: cases.name,
      createdAt: cases.createdAt,
      docCount: sql<number>`count(${documents.id})`,
    })
    .from(cases)
    .leftJoin(documents, eq(documents.caseId, cases.id))
    .where(eq(cases.userId, session.user.id))
    .groupBy(cases.id)
    .orderBy(desc(cases.createdAt))
    .limit(10);
}

export async function getCase(caseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const caseRecord = await db.query.cases.findFirst({
    where: eq(cases.id, caseId),
  });

  if (!caseRecord || caseRecord.userId !== session.user.id) {
    return null;
  }

  const docs = await db.query.documents.findMany({
    where: eq(documents.caseId, caseId),
    with: {
      extractedRequests: true,
    },
  });

  return { ...caseRecord, documents: docs };
}
