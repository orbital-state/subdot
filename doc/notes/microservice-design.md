## SubdotManager vs SubdotWorker

> What is the difference between SubdotManager, SubdotWorker and FilterManager? Does one really need FilterManager as a separate class?

## 🧩 Roles & Responsibilities

### **1. SubdotManager**

**Role**: The _controller_ for dynamic system state.

- **Listens** on the NATS control plane (e.g., `subdot.manager.filters.new`).
- **Receives and validates** new filter definitions (from CLI, CRD, etc.).
- **Manages system-level registration** of filters and potentially other config.
- **Could later coordinate** lifecycle (e.g., delete filters, list them, reload).

> Think of this as the API surface or admin controller for the system.

---

### **2. FilterManager**

**Role**: The _registry_ and validation layer for active filters.

- **Stores and indexes** filters (by ID, event type, source, etc.).
- **Provides efficient lookup** for filters relevant to a given event.
- Might implement **persistence or caching** in future versions.
- Used by workers/processors to resolve what filters are “live.”

> It abstracts the **filter lookup, query, and lifecycle** in one place.

---

### **3. SubdotWorker**

**Role**: The _executor_ for runtime event handling.

- **Subscribes to event streams** (e.g., blockchain, NATS subject).
- **Pulls matching filters** from the FilterManager for each event.
- **Evaluates filters**, triggers actions (`notify`, `store`, etc.).
- One or more can be scaled horizontally for high throughput.

> Think of this as a microservice worker that _does the work_.

---

## ❓ Do You Really Need `FilterManager`?

### 🔍 Arguments **For Keeping It Separate**:

- Clean **separation of concerns**: avoids coupling registry logic with control or execution.
- Supports future extensibility (e.g., filter versioning, metrics, hot-reloading).
- Can encapsulate optimizations for filter matching (indexes, precompiled expressions).

### 🪓 Arguments **Against** (for Simplification):

- If filters are simple and few, `SubdotManager` could store and serve them directly.
- Reduces class count and complexity for MVP/small deployments.

---

## ✅ Recommendation

- **Keep `FilterManager` as a separate class** if:
    - You anticipate >100 filters
    - Want to support external registration (CRD, UI, DQL, etc.)
    - Plan for pluggable stores or distributed coordination later (e.g., Redis, Etcd)

- **Inline into `SubdotManager`** if:  
    - You’re focusing on MVP/local CLI-only for now
    - Want to reduce boilerplate