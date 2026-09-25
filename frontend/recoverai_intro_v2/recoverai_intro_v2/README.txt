RECOVERAI INTRO V2

Files to replace/add:

1. Replace:
   src/pages/Home.jsx
   src/App.jsx

2. Add folder/files:
   src/components/intro/CyberGlobe.jsx
   src/components/intro/GlobeFragments.jsx
   src/components/intro/IntroOverlay.jsx

3. Open INTRO_CSS_APPEND.css and append its contents to the END of:
   src/styles/globals.css

Packages required (already installed in the project):
   three
   @react-three/fiber
   @react-three/drei

Run:
   npm run dev

Interaction:
   - At the top: 3D cyber Earth with continent outlines, grid, data points and scan arcs.
   - Scroll: the Earth begins fragmenting into 86 real 3D fragments.
   - Later: the navigation fragments settle into the top navigation bar.
   - Clicking a navigation fragment opens that existing page.
   - Existing app pages remain unchanged.
