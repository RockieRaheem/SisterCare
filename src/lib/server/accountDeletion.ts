import { getAdminDb } from "@/lib/firebaseAdmin";

const USER_OWNED_COLLECTIONS = [
  "conversations",
  "sessions",
  "reminders",
  "symptomLogs",
  "cycleHistory",
  "agentEvents",
] as const;

/**
 * Permanently removes user-owned Firestore data. recursiveDelete also removes
 * nested messages and profile subcollections. Auth deletion happens only
 * after this completes so a partial failure can be retried by the user.
 */
export async function deleteUserData(uid: string): Promise<{
  deletedDocuments: number;
}> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  let deletedDocuments = 0;
  const userRef = db.collection("users").doc(uid);
  const userSnapshot = await userRef.get();
  if (userSnapshot.exists) {
    await db.recursiveDelete(userRef);
    deletedDocuments += 1;
  }

  for (const collectionName of USER_OWNED_COLLECTIONS) {
    const snapshot = await db
      .collection(collectionName)
      .where("userId", "==", uid)
      .get();
    for (const document of snapshot.docs) {
      await db.recursiveDelete(document.ref);
      deletedDocuments += 1;
    }
  }

  const eventSnapshot = await db
    .collection("events")
    .where("payload.userId", "==", uid)
    .get();
  for (const document of eventSnapshot.docs) {
    await db.recursiveDelete(document.ref);
    deletedDocuments += 1;
  }

  return { deletedDocuments };
}

