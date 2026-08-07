# 🎨 Edge Config Integration - Visual Preview

## 📊 How It Works - Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│           Vercel Edge Config Store                              │
│  {                                                              │
│    "greeting": "hello world",                                  │
│    "features": { "aiCoach": true, "gpsTracking": true }       │
│  }                                                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼ (via @vercel/edge-config SDK)
        ┌────────────────────────┐
        │  api/edge-config.ts    │
        │                        │
        │  • getConfig()         │
        │  • getAllConfig()      │
        │  • hasConfig()         │
        │  • getConfigOrDefault()│
        └────────┬───────────────┘
                 │
                 ▼ (Express Server)
        ┌────────────────────────┐
        │   server.ts            │
        │                        │
        │  GET /api/config       │
        │  GET /api/config/:key  │
        │  GET /api/config/:key..│
        │    /default/:value     │
        └────────┬───────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼ (HTTP calls)            ▼ (HTTP calls)
┌──────────────┐        ┌──────────────────┐
│  React Hooks │        │  Custom Code     │
│              │        │  (fetch directly)│
│ useEdgeConfig│        │  const data =    │
│ useEdgeConfig│        │  await fetch(..) │
│ All()        │        │                  │
└──────────────┘        └──────────────────┘
```

---

## 💻 API Endpoints Examples

### 1️⃣ **Get All Configuration**

**Request:**
```bash
GET http://localhost:3000/api/config
```

**Response:**
```json
{
  "greeting": "hello world",
  "features": {
    "aiCoach": true,
    "gpsTracking": true,
    "betaAnalytics": false
  },
  "apiEndpoints": {
    "base": "https://api.example.com"
  }
}
```

**Status:** `200 OK`

---

### 2️⃣ **Get Specific Key**

**Request:**
```bash
GET http://localhost:3000/api/config/greeting
```

**Response:**
```json
{
  "greeting": "hello world"
}
```

**Status:** `200 OK`

---

### 3️⃣ **Get With Default Fallback**

**Request:**
```bash
GET http://localhost:3000/api/config/theme/default/light
```

**Response (if 'theme' doesn't exist):**
```json
{
  "theme": "light"
}
```

**Status:** `200 OK`

---

### 4️⃣ **Key Not Found**

**Request:**
```bash
GET http://localhost:3000/api/config/nonexistent
```

**Response:**
```json
{
  "error": "Configuration key \"nonexistent\" not found"
}
```

**Status:** `404 Not Found`

---

## 🎨 React Component Examples

### Example 1: Simple Hook Usage

```tsx
import { useEdgeConfig } from './utils/useEdgeConfig';

export function GreetingComponent() {
  const { value: greeting, loading, error } = useEdgeConfig('greeting');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <h1>{greeting}</h1>;
  // Renders: <h1>hello world</h1>
}
```

**What happens:**
1. Component mounts
2. Hook calls `GET /api/config/greeting`
3. Server calls `getConfig('greeting')`
4. Returns `{ greeting: "hello world" }`
5. Hook updates state
6. Component re-renders with value

---

### Example 2: With Default Value

```tsx
export function ThemeSelector() {
  const { value: theme } = useEdgeConfig('theme', 'light');
  
  return <div className={`theme-${theme}`}>
    Current theme: {theme}
  </div>;
}
```

**Scenarios:**
- If 'theme' exists → Shows actual value
- If 'theme' missing → Shows 'light' (default)
- If error → Still shows 'light' (default)

---

### Example 3: Fetch All Config

```tsx
import { useEdgeConfigAll } from './utils/useEdgeConfig';

export function ConfigDashboard() {
  const { config, loading, error } = useEdgeConfigAll();
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  
  return (
    <div>
      <h2>Current Configuration</h2>
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </div>
  );
}
```

**Output:**
```
Current Configuration
{
  "greeting": "hello world",
  "features": {
    "aiCoach": true,
    "gpsTracking": true
  }
}
```

---

### Example 4: Feature Flags in Real Component

```tsx
export function AdminDashboard() {
  const { value: features } = useEdgeConfigAll();
  
  return (
    <div>
      {features?.features?.aiCoach && (
        <section>
          <h2>AI Coach Settings</h2>
          {/* Show AI coach configuration UI */}
        </section>
      )}
      
      {features?.features?.gpsTracking && (
        <section>
          <h2>GPS Tracking Settings</h2>
          {/* Show GPS tracking configuration UI */}
        </section>
      )}
    </div>
  );
}
```

**Usage:**
- Change `aiCoach` to `false` in Vercel dashboard
- Refresh page → AI Coach section disappears (no rebuild!)
- Change back to `true` → Section reappears (instant!)

---

## 🎯 Server-Side Usage

### Example 1: Get Config in Route

```typescript
import { getConfig } from './api/edge-config';

app.get("/api/user-greeting", async (req, res) => {
  const greeting = await getConfig('greeting');
  res.json({ message: greeting });
});
```

**Request:**
```bash
GET http://localhost:3000/api/user-greeting
```

**Response:**
```json
{
  "message": "hello world"
}
```

---

### Example 2: Get All Config in Middleware

```typescript
import { getAllConfig } from './api/edge-config';

app.use(async (req, res, next) => {
  req.config = await getAllConfig();
  next();
});

app.get("/api/status", (req, res) => {
  res.json({
    appVersion: req.config?.appVersion,
    maintenance: req.config?.maintenanceMode
  });
});
```

---

### Example 3: Conditional Logic Based on Config

```typescript
import { getConfigOrDefault } from './api/edge-config';

app.post("/api/ai/coach", async (req, res) => {
  const aiEnabled = await getConfigOrDefault('features.aiCoach', false);
  
  if (!aiEnabled) {
    return res.status(503).json({ 
      error: "AI Coach is currently disabled" 
    });
  }
  
  // Process AI coaching...
});
```

---

## 📈 Real-Time Update Flow

### Initial State
```
Vercel Edge Config:
{
  "aiCoach": true
}

Browser:
useEdgeConfig('aiCoach') → value: true
→ UI shows AI Coach feature
```

### User Updates Config in Vercel
```
Dashboard Update:
{
  "aiCoach": false
}
```

### Browser Refresh
```
Browser:
useEdgeConfig('aiCoach') → value: false
→ UI hides AI Coach feature

Result: Feature instantly disabled! No rebuild needed! ✨
```

---

## 🔄 State Management Flow

### Initial Render
```
┌─────────────────────────────────┐
│ useEdgeConfig('greeting')       │
│                                 │
│ State:                          │
│  value: null (initial)          │
│  loading: true                  │
│  error: null                    │
│                                 │
│ UI: "Loading greeting..."       │
└─────────────────────────────────┘
```

### Fetching
```
┌─────────────────────────────────┐
│ useEffect triggered             │
│ Fetch: GET /api/config/greeting │
│                                 │
│ State:                          │
│  value: null (waiting)          │
│  loading: true                  │
│  error: null                    │
│                                 │
│ UI: "Loading greeting..."       │
└─────────────────────────────────┘
```

### Success
```
┌─────────────────────────────────┐
│ Response received:              │
│ { "greeting": "hello world" }   │
│                                 │
│ State:                          │
│  value: "hello world"           │
│  loading: false                 │
│  error: null                    │
│                                 │
│ UI: Displays "hello world"      │
└─────────────────────────────────┘
```

### Error
```
┌─────────────────────────────────┐
│ Network error or 404            │
│ (with default value provided)   │
│                                 │
│ State:                          │
│  value: "Default greeting"      │
│  loading: false                 │
│  error: "Failed to fetch..."    │
│                                 │
│ UI: Shows default or error msg  │
└─────────────────────────────────┘
```

---

## 🧪 Testing It Out

### Test 1: API Call in Browser
```bash
# Open browser console (F12) and run:
fetch('http://localhost:3000/api/config')
  .then(r => r.json())
  .then(console.log)

# Output:
// { greeting: 'hello world', ... }
```

### Test 2: Import Example Component
```tsx
// In your App.tsx or any page:
import EdgeConfigExample from './components/EdgeConfigExample';

export default function MyPage() {
  return (
    <>
      <h1>My Driving School App</h1>
      <EdgeConfigExample />  {/* Shows demo */}
    </>
  );
}
```

**Visual Output:**
```
═══════════════════════════════════════════
Edge Config Integration

Single Config Value
  Loading greeting...
  (after ~1s)
  Greeting: hello world

All Configuration Items
  {
    "greeting": "hello world"
  }

How to Use Edge Config in Your Components:
  [code snippet shown]
═══════════════════════════════════════════
```

---

## 🚀 Real-World Scenario

### Scenario: Disable AI Coach for Maintenance

**Step 1: Vercel Dashboard Change**
```
Before:
{
  "features": {
    "aiCoach": true
  }
}

After:
{
  "features": {
    "aiCoach": false
  }
}
```

**Step 2: Component Code**
```tsx
export function StudentDashboard() {
  const { value: features } = useEdgeConfig('features', {});
  
  return (
    <div>
      {features.aiCoach ? (
        <button onClick={() => startAISession()}>
          Chat with AI Coach
        </button>
      ) : (
        <div className="alert">
          AI Coach is temporarily unavailable
        </div>
      )}
    </div>
  );
}
```

**Step 3: User Refresh**
- Before: Button shows "Chat with AI Coach" ✅
- After: Message shows "AI Coach is temporarily unavailable" ⚠️

**No code deployment needed! No rebuild! Instant update!** ⚡

---

## 📊 Type Safety Example

```tsx
import { useTypedEdgeConfig } from './utils/edge-config-types';

interface MyConfig {
  aiCoach: boolean;
  gpsTracking: boolean;
  version: string;
}

export function ConfigDisplay() {
  // TypeScript knows the shape of your config!
  const { value: config } = useTypedEdgeConfig<MyConfig>('appConfig');
  
  if (config?.aiCoach) {
    // TypeScript autocomplete works here!
  }
}
```

**Benefits:**
- ✅ IDE autocomplete
- ✅ Type checking
- ✅ Catch errors at compile time
- ✅ Better documentation

---

## 🎯 Visual Component Demo

If you import `EdgeConfigExample.tsx` and add it to your page, you'll see:

```
╔═══════════════════════════════════════════════════════════════╗
║         Edge Config Integration                              ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ Single Config Value                                     │ ║
║  │                                                         │ ║
║  │ Greeting: hello world                                   │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ All Configuration Items                                 │ ║
║  │                                                         │ ║
║  │ {                                                       │ ║
║  │   "greeting": "hello world"                             │ ║
║  │ }                                                       │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ How to Use Edge Config in Your Components:             │ ║
║  │                                                         │ ║
║  │ import { useEdgeConfig } from '../utils/useEdgeConfig' │ ║
║  │ export function MyComponent() {                        │ ║
║  │   const { value, loading, error } =                   │ ║
║  │     useEdgeConfig('myKey', 'defaultValue')            │ ║
║  │   ...                                                  │ ║
║  │ }                                                       │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## ✨ Summary

**What you see when everything works:**

1. **API Endpoints** - Respond with your config items
2. **React Components** - Display values with hooks
3. **No Loading** - After dependencies installed
4. **Real-time** - Change Vercel config → See changes instantly
5. **Type Safe** - Full TypeScript support
6. **Error Handling** - Graceful fallbacks

**You're ready to:**
- ✅ Manage features without code changes
- ✅ A/B test variations
- ✅ Toggle features on/off
- ✅ Update pricing/content instantly
- ✅ Maintain app without downtime

This is production-grade configuration management! 🚀
