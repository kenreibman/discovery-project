"use server";

import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { del } from "@vercel/blob";

export async function addDocument(caseId: string, data: {
  blobUrl: string;
  filename: string;
  type: string;
  mimeType: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [doc] = await db.insert(documents).values({
    caseId,
    blobUrl: data.blobUrl,
    filename: data.filename,
    type: data.type,
    mimeType: data.mimeType,
  }).returning();

  revalidatePath(`/case/${caseId}`);
  revalidatePath("/dashboard");
  return doc;
}

export async function removeDocument(documentId: string, caseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });

  if (doc) {
    await del(doc.blobUrl);
    await db.delete(documents).where(eq(documents.id, documentId));
  }

  revalidatePath(`/case/${caseId}`);
  revalidatePath("/dashboard");
}

export async function updateDocumentType(
  documentId: string,
  type: "complaint" | "discovery_request",
  caseId: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await db
    .update(documents)
    .set({ type })
    .where(eq(documents.id, documentId));

  revalidatePath(`/case/${caseId}`);
}
