# Donut Chart Card for Home Assistant

A fast, theme-aware, multi-segment **donut / pie chart** for Home Assistant Lovelace.

- Multiple entities as segments (each with its own color & label)
- Center text: total or a specific entity
- Top label above the ring
- Legend with values and/or percentages
- Compact layout, designed to work nicely in **sections**
- No external libraries, pure SVG → very fast

> ℹ️ This card is configuration-driven (YAML). Segments (entities + colors) are defined in YAML.  
> Most layout options can be adjusted via the built-in UI editor.

---

## Features

- 📊 **Multi-segment donut chart**
  - Each segment is a Home Assistant entity
  - Numeric state values are used as segment sizes (negative values are treated as 0)

- 🎯 **Center display**
  - Show the **total** of all segments
  - Show a **specific entity**
  - Or show **nothing** in the center

- 🏷️ **Top label**
  - Text above the donut (e.g. _Solar Year 2025_)
  - Adjustable font scale and vertical offset

- 🧾 **Legend**
  - Show **value**, **percentage**, or **both**
  - Separate decimals for values and percentages
  - Font size scales with donut radius
  - Adjustable distance between donut and legend

- 🏷️ **Segment labels (optional)**
  - Show **value**, **percentage**, or **both** on the ring itself
  - Minimum angle threshold to avoid clutter
  - Adjustable label offset & font scale

- 🎨 **Theme-aware**
  - Uses Home Assistant’s card background and primary text color
  - Gap color between segments can auto-match the card background

- 📐 **Layout-friendly**
  - Scales nicely inside **sections** and regular views
  - Works well in grids with multiple cards side-by-side

---

## Installation

### 1. Download

Copy `donut-chart.js` into your `www` folder (usually `config/www/`):

```text
config/www/donut-chart.js