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
```

Or use HACS as a custom repository (if you publish it there).

### 2. Add as Lovelace resource

In Home Assistant:

**Settings → Dashboards → (⋮) → Resources → Add resource**

```yaml
url: /local/donut-chart.js
type: module
```

If you use HACS, the URL might look like:

```yaml
url: /hacsfiles/donut-chart/donut-chart.js
type: module
```

### 3. Use the card

In the dashboard UI, add a new card and search for **“Donut Chart”**  
(or use **Manual card** and paste the YAML examples below).

---

## Basic usage

### Minimal example

```yaml
type: custom:donut-chart
segments:
  - entity: sensor.solar_roof
    label: Roof
    color: '#f97316'
  - entity: sensor.solar_carport
    label: Carport
    color: '#22c55e'
  - entity: sensor.solar_garage
    label: Garage
    color: '#3b82f6'

center_mode: total
center_unit: kWh
top_label_text: Solar year 2025
```

This will:

- Use the **states** of the 3 sensors as segment sizes  
- Show the **total kWh** in the center  
- Show the top label `Solar year 2025`  
- Show a legend with values + percentages (default)

---

## Configuration options

### Segments

> Defined in YAML (not via UI). Each segment is one entity/label/color triple.

```yaml
segments:
  - entity: sensor.solar_roof
    label: Roof
    color: '#f97316'
  - entity: sensor.solar_carport
    label: Carport
    color: '#22c55e'
```

- `entity` (required): sensor entity id  
- `label` (optional): label in the legend (defaults to entity id)  
- `color` (optional): CSS color (hex, rgb, `var(--…)`)

States are parsed as numbers; negative values are treated as 0.

---

### Center text

```yaml
center_mode: total     # "total" | "entity" | "none"
center_entity: sensor.solar_roof   # used only if center_mode: entity
center_unit: kWh
center_decimals: 2
center_font_scale: 0.4   # 0.1–1.0 (relative to radius)
```

- `center_mode: total` → show sum of all segment values  
- `center_mode: entity` → show a specific entity’s value  
- `center_mode: none` → hide center text  

---

### Top label

```yaml
top_label_text: Solar year 2025
top_label_weight: 600
top_label_color: var(--primary-text-color)
top_label_font_scale: 0.35    # 0.1–1.0
top_label_offset_y: 0         # -100 to 100 (move label up/down)
label_ring_gap: 17            # distance from ring to top label
```

---

### Ring layout

```yaml
ring_radius: 65      # 30–120
ring_width: 8        # 4–40
ring_offset_y: 0     # -60–60 (move ring up/down)
track_color: var(--divider-color)
track_opacity: 0.0   # 0 = no background track, >0 = faint ring behind segments
min_total: 0         # optional minimum to treat as "empty"
```

---

### Segment labels on the donut (optional)

```yaml
segment_label_mode: value    # "none" | "value" | "percent" | "both"
segment_label_decimals: 1
segment_label_min_angle: 12  # minimum segment angle in degrees for label
segment_label_offset: 4      # distance outside the ring
segment_font_scale: 0.18     # 0.05–0.4
```

The card automatically skips labels on very small segments (angle below `segment_label_min_angle`).

---

### Legend

```yaml
show_legend: true
legend_value_mode: both        # "value" | "percent" | "both"
legend_value_decimals: 2
legend_percent_decimals: 1
legend_font_scale: 0.22        # 0.05–0.4, relative to radius
legend_offset_y: -20           # -80–80, distance between donut and legend
```

- **Font size** scales with `ring_radius` and `legend_font_scale`.  
- **Distance between donut and legend** is controlled by `legend_offset_y`:
  - Positive = more space  
  - Negative = bring legend closer to the donut (even *very* close if you want it compact)

---

### Segment gaps

By default, the card draws small gaps between segments to mimic a modern pie chart.

```yaml
segment_gap_width: 3          # 0 = no gaps
segment_gap_color: auto       # "auto" = card background, or any CSS color
```

> These options are **YAML-only** (not shown in the UI editor).  
> `segment_gap_color: auto` picks up the card background so the gaps blend nicely with your theme.

---

## Theme integration

The card uses Home Assistant theme variables:

- `var(--ha-card-background, var(--card-background-color))` for the card background  
- `var(--primary-text-color)` for text  
- `var(--divider-color)` as default track color  

So it should look good in both light and dark themes without extra styling.

---

## Using in sections (grid layout)

The card is designed to behave nicely in **sections** and grids.

Recommended when using this card inside a section:

```yaml
type: custom:donut-chart
segments:
  - entity: sensor.solar_roof
    label: Roof
    color: '#f97316'
  - entity: sensor.solar_carport
    label: Carport
    color: '#22c55e'

center_mode: total
center_unit: kWh
top_label_text: Solar year 2025

# Optional layout tuning in sections:
layout_options:
  grid_rows: auto      # let Home Assistant decide the height
  grid_columns: 4      # adjust to match your grid
```

- In most cases, **leave `grid_rows` on `auto`** and adjust the donut itself using:
  - `ring_radius`
  - `legend_font_scale`
  - `legend_offset_y`

Home Assistant controls the “grid slots” in sections;  
this card handles scaling **inside** the space it gets.

---

## Example: Energy split

A more complete example for energy distribution:

```yaml
type: custom:donut-chart
top_label_text: Energy 2025
top_label_font_scale: 0.32

segments:
  - entity: sensor.energy_solar_direct
    label: Solar direct
    color: '#f97316'
  - entity: sensor.energy_battery_discharge
    label: Battery
    color: '#22c55e'
  - entity: sensor.energy_grid_import
    label: Grid import
    color: '#3b82f6'

center_mode: total
center_unit: kWh
center_decimals: 1
center_font_scale: 0.42

segment_label_mode: none        # keep donut clean
segment_gap_width: 3
segment_gap_color: auto

show_legend: true
legend_value_mode: both
legend_value_decimals: 1
legend_percent_decimals: 1
legend_font_scale: 0.20
legend_offset_y: -30
```

---

## Performance

- No external libraries (no Chart.js, no ApexCharts, etc.)  
- Pure SVG rendering  
- Only uses the entities you configure in `segments:`  
- Very fast even with many cards on the same dashboard  

---

## License

MIT – feel free to use, tweak and contribute.