# Engineering Decisions — LUMOS Smart Lighting 3D Showroom

This document outlines the technical and product design decisions made while developing the landing page for **LUMOS**.

---

### 1. Conceptual Pivot & Product Ingestion Strategy
We replaced the background task observer website with **LUMOS**, a premium smart architectural desk lamp and lighting preset account. 
- **The Core Goal**: Sell the physical material design and software presets immediately.
- **Ingestion Strategy**: Instead of standard marketing copy, the page serves as a **digital showroom**. Placing an interactive hardware emulator directly on the screen allows developers to "touch" the lamp before buying it. They see the physical head adjust angles, and experience warm illumination gradients spreading across the page.
- **The Rationale for Accounts**: Users save custom scene values (brightness and Kelvins). The signup CTA becomes a natural step to sync settings with their hardware.

---

### 2. Three.js WebGL Scene & Raycasting Hinge Joint Physics
To render the desk lamp, we chose **Three.js WebGL** to achieve high-fidelity materiality and shadow depth:
- **Hinge Mechanical Hierarchy**: Built a double-arm joint system (`BaseGroup` -> `LowerArmGroup` -> `UpperArmGroup` -> `HeadGroup`).
- **Interactive Raycasting**: A mathematical plane is defined at the desk surface height. We cast a ray from the camera through the mouse coordinates onto this plane. The lamp joints dynamically rotate, pointing the head toward the cursor with a realistic mechanical drag (lerp inertia).
- **Physical Lighting & Shadows**: A `THREE.SpotLight` inside the lamp head casts shadows of the laptop, mug, and plant pot onto the desk.
- **Scroll Camera Interpolations**: Camera position vectors and lamp components (diffuser casing, hinge pins) are interpolated on scroll to separate and reassemble.
- **Performance Trade-off**: All elements are created using procedural Three.js geometries (boxes, cylinders, dodecahedrons) rather than downloading heavy `.gltf` assets. This keeps loading times instant and file sizes tiny while delivering 60fps.

---

### 3. AI Collaboration & Verification Metrics
- **AI Tasking**: Used AI to write the basic joint hierarchy groups, structure the hex-to-rgb color matrices, and design the timeline dragger touch event listeners.
- **Manual Verification**:
  1. *Mobile Viewport*: Stacked controls vertically at `390px` mobile sizes, scaling canvas dimensions so the light beam remains visually prominent.
  2. *Drag Boundaries*: Programmed touch gesture coordinates to prevent timeline handle offsets from snapping out of bounds.
  3. *Leak Prevention*: Verified that escaping the logo diagnostics console clears numerical update loops and keydown listeners.
