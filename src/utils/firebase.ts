import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, deleteDoc, getDocs, collection, getDocFromServer, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import appletConfig from "../../firebase-applet-config.json";

// Config for Auth (user's custom auth project where student/trainer credentials reside)
const authFirebaseConfig = {
  apiKey: "AIzaSyCN2N8Pm92laUqBAngxLVyyb7NMHvo__cs",
  authDomain: "golden-hands-81be8.firebaseapp.com",
  projectId: "golden-hands-81be8",
  storageBucket: "golden-hands-81be8.firebasestorage.app",
  messagingSenderId: "922377829851",
  appId: "1:922377829851:web:de1fb3d8360cd428453bfe"
};

// Initialize app for Auth
const authApp = initializeApp(authFirebaseConfig, "authApp");
export const auth = getAuth(authApp);

// Initialize app for Firestore Database (platform-managed db)
const dbApp = initializeApp(appletConfig);

// Initialize Firestore with custom database ID AND long polling for maximum mobile/webview connection stability
export const db = initializeFirestore(dbApp, {
  experimentalForceLongPolling: true,
}, appletConfig.firestoreDatabaseId);

// Enable Offline IndexedDB Persistence for hybrid mobile apps (Capacitor)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn("[Firebase] Offline persistence failed-precondition (multiple tabs open).");
  } else if (err.code == 'unimplemented') {
    console.warn("[Firebase] Offline persistence unimplemented in this browser.");
  } else {
    console.warn("[Firebase] Offline persistence enablement error:", err);
  }
});

// Validate Connection to Firestore (MANDATORY per system integration guidelines)
async function testConnection() {
  try {
    // Check connection by loading a non-existent document in an allowed collection (or check general state)
    // Using 'students/test_connection' as students collection has read/write allowed.
    await getDocFromServer(doc(db, "students", "test_connection"));
    console.log("[Firebase] Connection test completed successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("[Firebase] Connection test failed: Client is offline. Please check your Firebase configuration.");
    } else {
      console.warn("[Firebase] Connection test status (usually normal if empty collection):", error);
    }
  }
}
testConnection();

// Operation types for error reporting
enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (
    errMsg.includes("resource-exhausted") || 
    errMsg.includes("Quota limit exceeded") || 
    errMsg.includes("quota") || 
    errMsg.includes("exhausted")
  ) {
    console.warn("[Firebase] Detected Firestore daily free-tier quota exhausted. Switching app to local storage hybrid fallback mode.");
    localStorage.setItem("golden_hands_quota_exceeded", "true");
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error Detailed: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to run a promise with a timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${errorMessage}`)), timeoutMs)
    )
  ]);
}

// Helper to save a single document
export async function saveToCloud(collectionName: string, docId: string, data: any) {
  const fullPath = `${collectionName}/${docId}`;
  if (localStorage.getItem("golden_hands_quota_exceeded") === "true") {
    console.warn(`[Firebase] Write skipped for ${fullPath} because Firestore daily write quota is exceeded. Operating in local storage fallback mode.`);
    return;
  }
  try {
    const cleanData = JSON.parse(JSON.stringify(data)); // remove undefined values
    await withTimeout(
      setDoc(doc(db, collectionName, docId), cleanData),
      8000,
      `Saving to ${fullPath} timed out`
    );
    console.log(`[Firebase] Saved: ${fullPath}`);
  } catch (error) {
    console.error(`[Firebase] Save error for ${fullPath}:`, error);
    try {
      handleFirestoreError(error, OperationType.WRITE, fullPath);
    } catch (e) {
      console.warn(`[Firebase] Handled save failure for ${fullPath} gracefully (using local persistence fallback).`);
    }
  }
}

// Helper to delete a single document
export async function deleteFromCloud(collectionName: string, docId: string) {
  const fullPath = `${collectionName}/${docId}`;
  if (localStorage.getItem("golden_hands_quota_exceeded") === "true") {
    console.warn(`[Firebase] Delete skipped for ${fullPath} because Firestore daily write quota is exceeded. Operating in local storage fallback mode.`);
    return;
  }
  try {
    await withTimeout(
      deleteDoc(doc(db, collectionName, docId)),
      8000,
      `Deleting ${fullPath} timed out`
    );
    console.log(`[Firebase] Deleted: ${fullPath}`);
  } catch (error) {
    console.error(`[Firebase] Delete error for ${fullPath}:`, error);
    try {
      handleFirestoreError(error, OperationType.DELETE, fullPath);
    } catch (e) {
      console.warn(`[Firebase] Handled delete failure for ${fullPath} gracefully (using local persistence fallback).`);
    }
  }
}

// Helper to load an entire collection
export async function loadCollectionFromCloud(collectionName: string): Promise<any[]> {
  try {
    const querySnapshot = await withTimeout(
      getDocs(collection(db, collectionName)),
      8000,
      `Loading collection ${collectionName} timed out`
    );
    const items: any[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    console.log(`[Firebase] Loaded ${items.length} items from ${collectionName}`);
    return items;
  } catch (error) {
    console.error(`[Firebase] Load collection error for ${collectionName}:`, error);
    handleFirestoreError(error, OperationType.LIST, collectionName);
    return [];
  }
}

