import { getAdminDb, getAdminStorageBucket } from "@/lib/firebaseAdmin";

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
  deletedFiles: number;
}> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  let deletedDocuments = 0;
  let deletedFiles = 0;
  const deleteRef = async (ref: FirebaseFirestore.DocumentReference) => {
    await db.recursiveDelete(ref);
    deletedDocuments += 1;
  };
  const userRef = db.collection("users").doc(uid);
  const userSnapshot = await userRef.get();
  if (userSnapshot.exists) {
    await deleteRef(userRef);
  }

  for (const collectionName of USER_OWNED_COLLECTIONS) {
    const snapshot = await db
      .collection(collectionName)
      .where("userId", "==", uid)
      .get();
    for (const document of snapshot.docs) {
      await deleteRef(document.ref);
    }
  }

  const eventSnapshot = await db
    .collection("events")
    .where("payload.userId", "==", uid)
    .get();
  for (const document of eventSnapshot.docs) {
    await deleteRef(document.ref);
  }

  // Professional identity/KYC is user-owned, even when the account once held
  // a counsellor role. Shared session records are intentionally not erased
  // here; their retention requires a documented clinical/legal policy.
  for (const ref of [
    db.collection("counsellorApplications").doc(uid),
    db.collection("counsellors").doc(uid),
    db.collection("presence").doc(uid),
  ]) {
    if ((await ref.get()).exists) await deleteRef(ref);
  }
  const counsellorEvents = await db.collection("events").where("payload.counsellorId", "==", uid).get();
  for (const document of counsellorEvents.docs) await deleteRef(document.ref);

  const bucket = getAdminStorageBucket();
  if (bucket) {
    for (const prefix of [`counsellor-profile/${uid}/`, `counsellor-kyc/${uid}/`]) {
      const [files] = await bucket.getFiles({ prefix });
      await Promise.all(files.map(async (file) => { await file.delete({ ignoreNotFound: true }); deletedFiles += 1; }));
    }
  }

  return { deletedDocuments, deletedFiles };
}
