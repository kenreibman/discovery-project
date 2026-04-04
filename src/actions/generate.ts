"use server";

import { db } from "@/lib/db";
import { generatedResponses, extractedRequests } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function deleteGeneratedResponses(
  documentId: string,
  caseId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  try {
    // Find all extracted requests for this document
    const requests = await db.query.extractedRequests.findMany({
      where: eq(extractedRequests.documentId, documentId),
    });

    const requestIds = requests.map((r) => r.id);

    if (requestIds.length > 0) {
      await db
        .delete(generatedResponses)
        .where(inArray(generatedResponses.requestId, requestIds));
    }

    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete generated responses:", error);
    return { success: false, error: "Failed to delete responses" };
  }
}
