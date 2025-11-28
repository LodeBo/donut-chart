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

- 🏷️ **Top label**
  - Text above the donut 
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
---

## Installation

You can install this card **manually** or via **HACS**.

### Option A – Manual installation

1. Copy `donut-chart.js` into your `www` folder (usually `config/www/`):

   ```text
   config/www/donut-chart.js
   ```

2. Add the resource in Home Assistant:

   - Go to **Settings → Dashboards → (⋮) → Resources → Add resource**
   - Add:

     ```yaml
     url: /local/donut-chart.js
     type: module
     ```

3. Refresh the dashboard (clear browser cache if needed), then add a new card and search for **“Donut Chart”**  
   or use a **Manual card** with the YAML examples below.

---

### Option B – HACS (Custom repository)

1. In Home Assistant, open **HACS → Frontend → (⋮) → Custom repositories**.
2. Add:

   - **Repository**: `https://github.com/LodeBo/donut-chart`
   - **Category**: `Dashboard`

3. After adding, the card will appear in **HACS → Frontend**.  
   Click **Download** / **Install** to install `donut-chart.js`.

4. Make sure the resource is added automatically, or add it manually:

   ```yaml
   url: /hacsfiles/donut-chart/donut-chart.js
   type: module
   ```

5. Reload the dashboard and add a **Donut Chart** card.

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

## Configuration options (with allowed values)

### Segments (YAML only)

Defined in YAML (not via UI). Each segment is one entity/label/color triple.

```yaml
segments:
  - entity: sensor.solar_roof
    label: Roof
    color: '#f97316'
  - entity: sensor.solar_carport
    label: Carport
    color: '#22c55e'
```

| Option  | Type   | Required | Allowed / Meaning                          |
|--------|--------|----------|--------------------------------------------|
| `entity` | string | ✅      | Any numeric entity id (sensor, etc.)      |
| `label`  | string | ❌      | Free text, shown in the legend            |
| `color`  | string | ❌      | Any CSS color (`#rrggbb`, `rgb()`, `var()`) |

States are parsed as numbers; **negative values are treated as 0**.

---

### Center text

```yaml
center_unit: kWh
center_decimals: 2
center_font_scale: 0.4   # 0.1–1.0
```

| Option              | Type    | Default | Allowed values / range                        |
|---------------------|---------|---------|----------------------------------------------|
| `center_unit`       | string  | `""`    | Free text (e.g. `kWh`, `€`)                  |
| `center_decimals`   | number  | `2`     | `0`–`6`                                      |
| `center_font_scale` | number  | `0.4`   | `0.1`–`1.0` (relative to `ring_radius`)      |

---

### Top label

```yaml
top_label_text: Solar year 2025
top_label_weight: 600
top_label_color: var(--primary-text-color)
top_label_font_scale: 0.35    # 0.1–1.0
top_label_offset_y: 0         # -100–100
label_ring_gap: 17            # 0–60
```

| Option                 | Type    | Default   | Allowed values / range                    |
|------------------------|---------|-----------|------------------------------------------|
| `top_label_text`       | string  | `"Donut"` | Any text (empty = no top label)          |
| `top_label_weight`     | number  | `400`     | Typical font-weight (e.g. 300–700)       |
| `top_label_color`      | string  | theme     | CSS color / theme var                    |
| `top_label_font_scale` | number  | `0.35`    | `0.1`–`1.0`                              |
| `top_label_offset_y`   | number  | `0`       | `-100`–`100` (negative = move up)        |
| `label_ring_gap`       | number  | `17`      | `0`–`60` (distance between ring & label) |

---

### Ring layout

```yaml
ring_radius: 65      # 30–120
ring_width: 8        # 4–40
ring_offset_y: 0     # -60–60
track_color: var(--divider-color)
track_opacity: 0.0   # 0.0–1.0
min_total: 0
```

| Option          | Type   | Default | Allowed values / range                           |
|-----------------|--------|---------|-------------------------------------------------|
| `ring_radius`   | number | `65`    | `30`–`120` (bigger card = bigger radius)        |
| `ring_width`    | number | `8`     | `4`–`40`                                        |
| `ring_offset_y` | number | `0`     | `-60`–`60` (negative = move ring up)            |
| `track_color`   | string | theme   | CSS color                                       |
| `track_opacity` | number | `0.0`   | `0.0`–`1.0` (`0` = no background ring)          |
| `min_total`     | number | `0`     | Minimum sum; below this the donut is treated as 0 |

---

### Segment labels on the donut (optional)

```yaml
segment_label_mode: value    # "none" | "value" | "percent" | "both"
segment_label_decimals: 1
segment_label_min_angle: 12  # degrees
segment_label_offset: 4      # px outside the ring
segment_font_scale: 0.18     # 0.05–0.4
```

| Option                   | Type    | Default | Allowed values / range                                 |
|--------------------------|---------|---------|-------------------------------------------------------|
| `segment_label_mode`     | string  | `value` | `none`, `value`, `percent`, `both`                    |
| `segment_label_decimals` | number  | `1`     | `0`–`6`                                               |
| `segment_label_min_angle`| number  | `12`    | `0`–`360` (minimum segment angle to show a label)     |
| `segment_label_offset`   | number  | `4`     | Typically `0`–`20`, distance outside the ring         |
| `segment_font_scale`     | number  | `0.18`  | `0.05`–`0.4`                                          |

For very small segments (angle < `segment_label_min_angle`), labels are automatically skipped.

---

### Legend

```yaml
show_legend: true
legend_value_mode: both        # "value" | "percent" | "both"
legend_value_decimals: 2
legend_percent_decimals: 1
legend_font_scale: 0.22        # 0.05–0.4
legend_offset_y: -20           # -80–80
```

| Option                     | Type    | Default | Allowed values / range                                 |
|----------------------------|---------|---------|-------------------------------------------------------|
| `show_legend`              | boolean | `true`  | `true` or `false`                                     |
| `legend_value_mode`        | string  | `both`  | `value`, `percent`, `both`                            |
| `legend_value_decimals`    | number  | `2`     | `0`–`6`                                               |
| `legend_percent_decimals`  | number  | `1`     | `0`–`6`                                               |
| `legend_font_scale`        | number  | `0.22`  | `0.05`–`0.4` (relative to `ring_radius`)             |
| `legend_offset_y`          | number  | `0`     | `-80`–`80` (negative = closer to the donut)          |

- To make the legend **smaller or larger** → change `legend_font_scale`.  
- To change the **distance between donut and legend** → use `legend_offset_y`  
  (negative values pull the legend closer to the ring).

---

### Segment gaps (YAML only)

```yaml
segment_gap_width: 3          # 0 = no gaps
segment_gap_color: auto       # "auto" or CSS color
```

| Option              | Type   | Default | Allowed values / range                                |
|---------------------|--------|---------|------------------------------------------------------|
| `segment_gap_width` | number | `3`     | `0`–`10` (0 = no gap between segments)              |
| `segment_gap_color` | string | `auto`  | `auto` (= card background) or any CSS color         |

`auto` tries to use the card background so gaps blend with the theme.

---

### Card / layout styling

```yaml
background: var(--ha-card-background, var(--card-background-color))
border_radius: 12px
border: 1px solid var(--ha-card-border-color, rgba(0,0,0,0.12))
box_shadow: none
padding: 0px
max_width: 100%
```

| Option          | Type   | Default | Allowed values / range               |
|-----------------|--------|---------|-------------------------------------|
| `background`    | string | theme   | CSS color / gradient                |
| `border_radius` | string | `12px`  | e.g. `0`, `12px`, `1rem`            |
| `border`        | string | theme   | Any CSS border string               |
| `box_shadow`    | string | `none`  | Any CSS box-shadow                  |
| `padding`       | string | `0px`   | Any CSS padding                     |
| `max_width`     | string | `100%`  | e.g. `100%`, `520px`                |

When using **sections**, you can also use `layout_options`:

```yaml
layout_options:
  grid_rows: auto        # usually keep this on auto
  grid_columns: 4        # number of columns for the card in the section
```

---

## Theme integration

The card uses Home Assistant theme variables:

- `var(--ha-card-background, var(--card-background-color))` → card background  
- `var(--primary-text-color)` → text color  
- `var(--divider-color)` → default track color  

So it works out of the box with both light and dark themes.

---

## Using in sections (grid layout)

Recommended example in a section:

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

layout_options:
  grid_rows: auto
  grid_columns: 4
```

- Keep `grid_rows` on `auto`.  
- Adjust the visual size with `ring_radius`, `legend_font_scale`, `legend_offset_y`, etc.

---

## Example: Energy split

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

segment_label_mode: none
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
