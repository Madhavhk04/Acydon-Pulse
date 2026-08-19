# Engineering & Product Decisions — LUMOS

This document outlines the technical architecture, product strategy, and trade-offs made while building the homepage for **LUMOS**.

---

### 1. Ingestion Strategy & Product Pivot
**Question: Why this ingestion strategy over the obvious alternative you rejected?**

- **Strategy Chosen**: A live, interactive **WebGL hardware showroom emulator**. The user is immediately placed in control of a physical smart lamp sitting on an interactive 3D desk. Dragging across the desk points the lamp head, while sliders dynamically tune light temperature, brightness, density, and spread with real-time full-page ambient illumination tinting.
- **Alternative Rejected**: The standard alternative—static UI mockups, product video loops, or generic feature grid cards.
- **Why Rejected**: Static screenshots and pre-rendered videos fail to generate the immediate, visceral **"wow, I want an account"** reaction in the first 3 seconds. By making the product physically tactile directly in the browser, the user experiences ownership before purchasing. The account creation CTA then becomes a natural, logical step: saving custom lighting presets and syncing them to their hardware.

---

### 2. Time-Limit Trade-off & Future Roadmap
**Question: One trade-off you made under the time limit, and what you’d do with a real week.**

- **Time-Limit Trade-off**: Procedural Three.js geometries vs. high-poly CAD GLTF models.
  To meet time constraints and guarantee instant **0ms asset load time**, zero network waterfall delays, and a tiny bundle size (`< 30KB` total CSS/HTML), we constructed the lamp, desk, laptop, mug, and plant procedurally using raw Three.js primitives (`BoxGeometry`, `CylinderGeometry`, `DodecahedronGeometry`).
- **What We'd Do With a Real Week**:
  1. **GLTF CAD Models & PBR Textures**: Import photorealistic CAD models featuring brushed anodized aluminum, bead-blasted zinc joints, and frosted acrylic light diffusers with custom normal maps.
  2. **Custom WebGPU Raymarched Volumetric Shaders**: Implement WebGPU volumetric fog shaders for realistic light shafts and ambient occlusion under the desk lamp.
  3. **Preset Cloud Storage**: Connect account authentication to a real Supabase/Firebase backend with webhooks to control physical IoT smart lights via WebSockets.

---

### 3. AI Collaboration & Verification Process
**Question: Where did you use AI tools, and what did you personally verify or change afterward?**

- **AI Usage**:
  - Drafting initial Three.js scene boilerplate and joint group transformation matrices (`BaseGroup` → `LowerArmGroup` → `UpperArmGroup` → `HeadGroup`).
  - Generating GSAP timeline scrub mappings for camera position vectors.
  - Structuring CSS tokens for dark-mode glassmorphism.
- **Manual Verification & Refinement**:
  - **Mechanical Physics**: Fine-tuned spring-damper physics (`stiffness 0.065`, `damping 0.74`) on lamp arm joints to replace robotic linear lerping with natural physical weight and settling inertia.
  - **Lighting & Boundary Geometry**: Rebuilt spotlight geometry to restrict cone angle to physically realistic desk lamp boundaries (`12°–55°`) and prevented light bleeding below the desk plane.
  - **Layout & Typography**: Adjusted spatial background typography (`LIGHT THAT ADAPTS.`) to `top: 4.8rem` with `z-index: 10` high-contrast luminous styling, ensuring zero overlap with control cards across viewports.
  - **Responsiveness & Auditing**: Tested at `390px` mobile and `1440px` desktop viewports to guarantee 0px horizontal overflow, crisp 60fps performance, clean tab title (`LUMOS`), and custom SVG favicon.
