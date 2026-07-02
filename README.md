# Plate Math : WebGL Barbell Calculator

A 3D barbell plate calculator built with **raw WebGL2**. No Three.js, no
build step, no dependencies. Load color-coded plates onto an Olympic barbell
in three setups (floor/deadlift, squat rack, and bench press) and watch the
total weight update live as you plan a lift.

[![Plate Math screenshot](https://i.ibb.co/n8wkc9cX/Screenshot-2026-07-02-153451.png)](https://ibb.co/x825jWjn)

## Features

- Three configurations: **floor (deadlift)**, **squat rack**, and **bench press**
- Pounds (45 / 35 / 25 / 10 / 5 / 2.5) or IWF-standard kilograms
  (25 / 20 / 15 / 10 / 5 / 2.5 / 1.25)
- Two bars: **Olympic** (45 lb / 20 kg) and **Women's Olympic** (33 lb / 15 kg)
- Live total weight with per-side breakdown and unit conversion
- Real-time shadow mapping via a depth framebuffer, procedural textures, and
  Blinn-Phong lighting
- Toggle key light, fill light, shadows, textures, and camera auto-rotate

## Getting Started

The app uses ES modules, so it must be served over HTTP; opening
`index.html` directly with `file://` will not work. Serve the `app/` folder
with any static server:

```bash
# Bun
bunx serve app -l 8000

# Node
npx serve app -l 8000

# Python 3
python -m http.server 8000 -d app
```

Then open <http://localhost:8000>.

## Controls

| Action | How |
| --- | --- |
| Rotate camera | Drag on the canvas |
| Zoom | Scroll |
| Everything else | Panel on the top right |

The top-right panel controls the setup, units, bar type, plate buttons,
lighting, and camera. The total bar weight shows top-center and on the
in-scene LED scoreboard.

## Project Structure

```
app/
├── index.html
├── css/style.css
└── js/
    ├── main.js        # entry point + animation loop
    ├── config.js      # bar/plate specs, layout, lights
    ├── math3d.js      # matrix + vector helpers
    ├── geometry.js    # procedural meshes
    ├── textures.js    # canvas-painted textures
    ├── shaders.js     # GLSL ES 3.00 sources
    ├── renderer.js    # WebGL2 context + shadow FBO
    ├── camera.js      # orbit camera
    ├── scene.js       # gym environment, rack, bench
    ├── barbell.js     # bar, plate loading, weight math
    └── ui.js          # widgets and readouts
```

## Requirements

Any modern browser with WebGL2 support (Chrome, Edge, or Firefox).
