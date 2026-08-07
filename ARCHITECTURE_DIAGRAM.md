# Edge Config Architecture & Flow Diagram

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Vercel Edge Network                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         Vercel Edge Config Store                           │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ {                                                    │ │ │
│  │  │   "greeting": "hello world",                         │ │ │
│  │  │   "features": { ... },                               │ │ │
│  │  │   "apiEndpoints": { ... }                            │ │ │
│  │  │ }                                                    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                      ID: ecfg_...                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                        ▲
                        │ Connection String
                        │ (env variable)
                        │
         ┌──────────────┴──────────────┐
         │                             │
    ┌────▼─────────┐        ┌──────────▼──────┐
    │   Your App   │        │  Build/Deploy   │
    │   (Vite)     │        │   (Vercel)       │
    │              │        │                  │
    │ ┌──────────┐ │        └──────────────────┘
    │ │ Browser  │ │
    │ │ (React)  │ │
    │ └─────┬────┘ │
    │       │      │
    │       ▼      │
    │ ┌──────────────────────────┐
    │ │  /api/config endpoints   │
    │ │  ┌────────────────────┐  │
    │ │  │ Express Server     │  │
    │ │  │ (server.ts)        │  │
    │ │  │                    │  │
    │ │  │ Routes:            │  │
    │ │  │ - GET /api/config  │  │
    │ │  │ - GET /api/config/ │  │
    │ │  │   :key             │  │
    │ │  │ - GET /api/config/ │  │
    │ │  │   :key/default/:dv │  │
    │ │  └─────┬──────────────┘  │
    │ │        │                 │
    │ │        ▼                 │
    │ │  ┌─────────────────────┐ │
    │ │  │ api/edge-config.ts  │ │
    │ │  │ Server utilities:   │ │
    │ │  │ - getConfig()       │ │
    │ │  │ - getAllConfig()    │ │
    │ │  │ - hasConfig()       │ │
    │ │  └──────────┬──────────┘ │
    │ │             │            │
    │ └─────────────┼────────────┘
    │               │
    └───────────────┼────────────────────────────────────────┬─────────┐
                    │                                        │ Network │
                    ▼                                        ▼         │
            ┌───────────────────┐         @vercel/edge-config SDK    │
            │ Environment Var   │         (Node.js Module)            │
            │ EDGE_CONFIG_      │                                      │
            │ CONNECTION_STRING ◄────────────────────────────────────┘
            └───────────────────┘
```

## Data Flow Diagram

### 1. **React Component → Server → Edge Config**

```
┌──────────────────────┐
│  React Component     │
│                      │
│  useEdgeConfig()     │
└──────────┬───────────┘
           │ (1) HTTP Request
           │ GET /api/config/greeting
           ▼
┌──────────────────────┐
│  Express Server      │
│  (server.ts)         │
│                      │
│  app.get(/api/...)   │
└──────────┬───────────┘
           │ (2) Call getConfig()
           ▼
┌──────────────────────┐
│  api/edge-config.ts  │
│                      │
│  getConfig(key)      │
└──────────┬───────────┘
           │ (3) Import from SDK
           │ @vercel/edge-config
           ▼
┌──────────────────────┐
│  @vercel/edge-config │
│                      │
│  Uses connection     │
│  string from env     │
└──────────┬───────────┘
           │ (4) Fetch from Edge
           │
           ▼
┌──────────────────────────────┐
│  Vercel Edge Config Store    │
│  Returns: value              │
└──────────┬────────────────────┘
           │
           │ (5) Response JSON
           ▼
┌──────────────────────┐
│  Express Server      │
│  res.json(data)      │
└──────────┬───────────┘
           │ (6) HTTP Response
           ▼
┌──────────────────────┐
│  React Component     │
│  setState(value)     │
│  render()            │
└──────────────────────┘
```

## File Organization

```
golden-hands-driving-school/
│
├── 📁 api/
│   └── 📄 edge-config.ts
│       ├── getConfig(key)
│       ├── getAllConfig()
│       ├── hasConfig(key)
│       └── getConfigOrDefault(key, default)
│
├── 📁 src/
│   ├── 📁 utils/
│   │   ├── 📄 useEdgeConfig.ts (React Hooks)
│   │   │   ├── useEdgeConfig<T>(key, default)
│   │   │   └── useEdgeConfigAll()
│   │   │
│   │   └── 📄 edge-config-types.ts (TypeScript)
│   │       ├── EdgeConfigStore interface
│   │       ├── CONFIG_KEYS constants
│   │       ├── Validators
│   │       └── Transformers
│   │
│   └── 📁 components/
│       └── 📄 EdgeConfigExample.tsx (Demo)
│           ├── Shows useEdgeConfig usage
│           ├── Shows useEdgeConfigAll usage
│           ├── Error handling
│           └── Loading states
│
├── 📄 server.ts (Modified)
│   └── Three new routes:
│       ├── GET /api/config
│       ├── GET /api/config/:key
│       └── GET /api/config/:key/default/:value
│
├── 📄 package.json (Modified)
│   └── Added: @vercel/edge-config
│
├── 📄 .env.example (Modified)
│   └── Added: EDGE_CONFIG_CONNECTION_STRING
│
└── 📄 Documentation/
    ├── EDGE_CONFIG_SETUP.md
    ├── EDGE_CONFIG_QUICK_REFERENCE.md
    ├── EDGE_CONFIG_INTEGRATION_SUMMARY.md
    └── ARCHITECTURE_DIAGRAM.md (this file)
```

## Component Integration Diagram

```
┌─────────────────────────────────────────────┐
│           React Application                 │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │          App.tsx                     │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │ AdminDashboard                 │ │  │
│  │  │ (Uses config for feature flags)│ │  │
│  │  │ useEdgeConfig('features')      │ │  │
│  │  └────────────────────────────────┘ │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │ StudentApp                     │ │  │
│  │  │ (Uses config for API endpoints)│ │  │
│  │  │ useEdgeConfig('apiEndpoints')  │ │  │
│  │  └────────────────────────────────┘ │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │ EdgeConfigExample              │ │  │
│  │  │ (Demo component)               │ │  │
│  │  │ useEdgeConfigAll()             │ │  │
│  │  └────────────────────────────────┘ │  │
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│            │                                │
│            ▼ (fetch data)                   │
│  ┌──────────────────────────────────────┐  │
│  │   useEdgeConfig Hook                 │  │
│  │   (src/utils/useEdgeConfig.ts)       │  │
│  └──────────────────────────────────────┘  │
│            │                                │
└────────────┼────────────────────────────────┘
             │ HTTP calls
             ▼
    ┌─────────────────────┐
    │  Express Server     │
    │  Port 3000          │
    └─────────────────────┘
```

## Request/Response Cycle

### Example 1: Get Greeting

```
CLIENT REQUEST:
────────────────────────────────────────────
GET /api/config/greeting
Host: localhost:3000

SERVER PROCESSING:
────────────────────────────────────────────
1. Express matches route pattern: GET /api/config/:key
2. Extracts key = 'greeting'
3. Calls: getConfig('greeting')
4. getConfig() uses @vercel/edge-config SDK
5. SDK uses EDGE_CONFIG_CONNECTION_STRING env var
6. Connects to Vercel Edge Config
7. Retrieves value: 'hello world'

SERVER RESPONSE:
────────────────────────────────────────────
HTTP/1.1 200 OK
Content-Type: application/json

{
  "greeting": "hello world"
}

BROWSER/CLIENT:
────────────────────────────────────────────
1. React component receives response
2. Updates state: value = 'hello world'
3. Re-renders with the value
```

### Example 2: Get with Default

```
CLIENT REQUEST:
────────────────────────────────────────────
GET /api/config/myKey/default/fallback
Host: localhost:3000

SERVER PROCESSING:
────────────────────────────────────────────
1. Express matches route pattern
2. Extracts: key = 'myKey', defaultValue = 'fallback'
3. Calls: getConfigOrDefault('myKey', 'fallback')
4. SDK tries to get 'myKey'
5. Key not found → returns 'fallback'

SERVER RESPONSE:
────────────────────────────────────────────
HTTP/1.1 200 OK
Content-Type: application/json

{
  "myKey": "fallback"
}
```

## State Management Flow

```
┌──────────────────────────────────────────────────┐
│  useEdgeConfig Hook (Component Level)             │
│                                                  │
│  State: {                                        │
│    value: T | null,      // Config value        │
│    loading: boolean,      // Fetch status        │
│    error: string | null   // Error message       │
│  }                                               │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ useEffect (runs on mount & key change)    │ │
│  │                                            │ │
│  │ 1. Set loading = true                      │ │
│  │ 2. Fetch from /api/config/:key             │ │
│  │ 3. On success:                             │ │
│  │    - Set value = response[key]             │ │
│  │    - Set loading = false                   │ │
│  │ 4. On error:                               │ │
│  │    - Set error = error message             │ │
│  │    - Set loading = false                   │ │
│  │    - Set value = defaultValue              │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ Return {value, loading, error}             │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

## Deployment Flow

```
Local Development:
─────────────────────────────────────────────────────
npm install @vercel/edge-config
npm run dev
→ Server starts on localhost:3000
→ Reads .env.local
→ Edge Config SDK works with your store


Vercel Deployment:
─────────────────────────────────────────────────────
git push
   │
   ▼
Vercel builds your app
   │
   ├─ npm install (includes @vercel/edge-config)
   ├─ npm run build
   ├─ Detects Edge Config connection string
   │
   ▼
App deployed to Vercel Edge Network
   │
   ├─ Server has access to @vercel/edge-config
   ├─ Environment variable auto-injected
   ├─ API endpoints work at edge
   │
   ▼
React frontend loaded
   │
   ├─ Components use useEdgeConfig hooks
   ├─ Call /api/config/* endpoints
   ├─ Get data from Edge Config
   │
   ▼
Config changes are instant
(No rebuild needed!)
```

---

## Key Points

✅ **Edge Config is the source of truth** - All config stored in one place
✅ **No rebuilds needed** - Change config, instantly available
✅ **Fast access** - Data served from Vercel Edge Network
✅ **Type-safe** - Use TypeScript interfaces and hooks
✅ **Centralized** - One API pattern for all config access
✅ **Scalable** - Works with your app as it grows

---

## Integration Checklist

- [x] Package added to dependencies
- [x] Server utilities created (api/edge-config.ts)
- [x] Express routes added
- [x] React hooks created
- [x] TypeScript types defined
- [x] Example component provided
- [x] Documentation created
- [ ] Environment variable configured (you do this)
- [ ] Dependencies installed (you do this: npm install)
- [ ] Config items added to Vercel Edge Config (you do this)
- [ ] Components integrated into your app (you do this)
