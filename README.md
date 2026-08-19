# LUMA

LUMA is a premium interactive landing page and hardware emulator for a fictional smart architectural desk lamp and lighting environment.

The site is built as a digital product showroom. It lets visitors interact with a custom-rendered physics canvas lamp, test scene presets, drag timeline schedule sliders, and synchronize configurations with a mock account profile.

---

## ✨ Features

### 1. Interactive Lamp Emulator
- **Mouse Coordinate Orientation**: The lamp head and support joints adjust angles dynamically to follow the cursor.
- **Diffuse Beam Cast**: Renders radial and linear gradients that fade organically, casting a warm light cone across the viewport.
- **State Toggles**: Smooth fade-in and fade-out animations when switching the lamp ON/OFF.

### 2. Presets & Scenes Panel
- **Default Scenes**: Swap between **FOCUS** (4100K, 82% brightness), **READING** (3200K, 60% brightness), and **WIND DOWN** (2200K, 30% brightness) to watch the lamp adapt in real-time.
- **Save Scene CTA**: Exposes a summary of the current presets configuration, linking configuration values to account registration.

### 3. Progressive Exploded Reveal
- Scroll-triggered components section. As the page scrolls, the lamp joints expand along offset coordinates, highlighting internal components (Light Engine, Diffuser, Precision Arm, Ambient Sensor, Control Core).

### 4. Presets Timeline Automation
- Drag timeline handles from 08:00 to 20:00 to see how the lamp's light output transitions over a normal day.

### 5. Hidden Engineering HUD Easter Egg
- Clicking the **LUMA logo 5 times** opens an engineering dashboard display detailing LED temperatures, power ratings, voltage feedback, and real-time microvolt streams.

---

## 🛠️ Technology Stack
- **Core**: HTML5, Vanilla JavaScript, Canvas API.
- **Styling**: Vanilla CSS (Premium Monochrome theme).
- **Tooling**: Vite (Development & Production bundling).

---

## 🚀 Setup & Installation

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start local hot-reload dev server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173/` in your browser.

### Production Build
1. Compile and bundle static assets:
   ```bash
   npm run build
   ```
2. The bundled assets will be exported to the `/dist` directory.

---

## 🌐 Deployment Links
- **GitHub Repository**: [https://github.com/Madhavhk04/Acydon-Pulse](https://github.com/Madhavhk04/Acydon-Pulse)
- **Live Website**: [https://acydon-pulse.vercel.app/](https://acydon-pulse.vercel.app/)
- **Walkthrough Video**: [https://acydon-pulse.vercel.app/pulse_home_page_flow.webp](https://acydon-pulse.vercel.app/pulse_home_page_flow.webp)
