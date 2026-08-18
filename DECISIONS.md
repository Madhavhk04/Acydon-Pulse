# Engineering Decisions — Acydon Pulse Premium Home Page

This document details the critical technical and design decisions made while developing the landing page for **Acydon Pulse**.

---

### 1. Ingestion Strategy: Interactive Product Simulation vs. Marketing Copy
Instead of the standard SaaS landing page template (relying on fabricated user metrics, generic stock screenshots, and mock corporate logos—which we explicitly rejected to maintain absolute transparency), we implemented a **Product-UI Ingestion Strategy**. 

The target audience (engineers) processes value through code and interface utility. By placing a fully interactive, live-simulated worker queue console directly in the hero layout, we let developers "ingest" the product experience immediately. The simulator is clearly marked with `SIMULATION • LIVE DEMO`. It demonstrates:
- How failures (`UpdateSubscription`) capture arguments and exact SQL statements.
- Live queue latency, worker load, and process outcomes.
- How the observability engine captures thread-local context with negligible overhead.

This approach immediately establishes technical credibility in the first 3 seconds, aligning with the challenge's "honesty" and "systems thinking" criteria.

---

### 2. Time-Limit Trade-offs & A Real Week's Scope
- **The Trade-off**: The landing page console operates on a deterministic JavaScript state machine containing mock job structures. There is no active backend agent process capturing live events.
- **With a Real Week**: We would develop a lightweight agent package (`@acydon/pulse-agent`) that hooks into Celery/Sidekiq/BullMQ middleware. The agent would run a background thread to batch and flush task traces out-of-band to a local receiver. We would build a dockerized demo environment where a user could run `docker-compose up` to run actual worker tasks (generating database transactions) and watch them stream in real-time to the dashboard via WebSockets.

---

### 3. AI Collaboration & Verification Details
- **AI Utilization**: We pair-programmed with AI to scaffold the initial boilerplate HTML5 tags, compile basic CSS grid frameworks, and generate syntax code blocks for the integration panel.
- **Human Verification & Refinement**:
  1. **Visual Polish & Restraint**: Cleaned up the animation budget. Kept transitions minimal, making the live job ticker the main motion source, and limited other movements to subtle hover indicators to prevent visual fatigue.
  2. **Mobile Layout Integrity**: Manually adjusted flex layout margins and collapsed columns in CSS media queries to guarantee a seamless fit at `390px` mobile width (specifically testing table padding and code wrapping) and `1440px` desktop views.
  3. **Performance Optimization**: Wrote custom, clean inline SVGs instead of fetching external fonts/icons, minimizing render-blocking requests.
  4. **Easter Egg Lifecycle**: Engineered the canvas Matrix animation to completely clear its redraw interval and event listeners when closed, preventing background thread memory leaks.
