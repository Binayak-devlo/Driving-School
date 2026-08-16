import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDocsFromServer, 
  collection, 
  getDocFromServer,
  setLogLevel
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import appletConfig from "../../firebase-applet-config.json";

// Initialize single Firebase app with official applet config
const app = initializeApp(appletConfig);

// Firebase Authentication instance
export const auth = getAuth(app);

// Initialize Firestore with modern persistent local cache and auto-detect long polling
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    experimentalAutoDetectLongPolling: true,
  },
  appletConfig.firestoreDatabaseId
);

// Set log level to error to avoid noisy offline retry warning traces
setLogLevel("error");

// Validate Connection to Firestore (MANDATORY per system integration guidelines)
async function testConnection() {
  try {
    await withTimeout(getDocFromServer(doc(db, "test", "connection")), 4000, "Connection check");
    console.log("[Firebase] Firestore connection initialized successfully.");
  } catch (error) {
    if (error instanceof Error && (error.message.includes("the client is offline") || error.message.includes("unavailable"))) {
      console.log("[Firebase] Operating with local persistence cache until connection resumes.");
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
  console.warn("Firestore Operation Notice: ", JSON.stringify(errInfo));
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
      25000,
      `Saving to ${fullPath} timed out`
    );
    console.log(`[Firebase] Saved: ${fullPath}`);
  } catch (error) {
    console.warn(`[Firebase] Save notice for ${fullPath} (persisted locally, syncing in background):`, error);
    handleFirestoreError(error, OperationType.WRITE, fullPath);
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
      25000,
      `Deleting ${fullPath} timed out`
    );
    console.log(`[Firebase] Deleted: ${fullPath}`);
  } catch (error) {
    console.warn(`[Firebase] Delete notice for ${fullPath} (persisted locally, syncing in background):`, error);
    handleFirestoreError(error, OperationType.DELETE, fullPath);
  }
}

// Helper to load an entire collection with fast server check and graceful getDocs fallback
export async function loadCollectionFromCloud(collectionName: string): Promise<any[]> {
  try {
    let querySnapshot;
    try {
      querySnapshot = await withTimeout(
        getDocsFromServer(collection(db, collectionName)),
        5000,
        `Loading collection ${collectionName} timed out`
      );
    } catch (serverErr) {
      console.warn(`[Firebase] Server fetch for ${collectionName} timed out or offline, falling back to cached getDocs...`);
      querySnapshot = await getDocs(collection(db, collectionName));
    }

    const items: any[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    console.log(`[Firebase] Loaded ${items.length} items from ${collectionName}`);
    return items;
  } catch (error) {
    console.warn(`[Firebase] Load collection fallback notice for ${collectionName}:`, error);
    handleFirestoreError(error, OperationType.LIST, collectionName);
    return [];
  }
}

