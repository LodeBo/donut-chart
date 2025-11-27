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
| `color`  | string | ❌      | Any CSS color (`#rrggbb`, `rgb()`, `var()`)|

States are parsed as numbers; **negative values are treated as 0**.

---

### Center text

```yaml
center_mode: total     # "total" | "entity" | "none"
center_entity: sensor.solar_roof   # only for center_mode: entity
center_unit: kWh
center_decimals: 2
center_font_scale: 0.4   # 0.1–1.0
```

| Option             | Type    | Default | Allowed values / range                        |
|--------------------|---------|---------|----------------------------------------------|
| `center_mode`      | string  | `total` | `total`, `entity`, `none`                    |
| `center_entity`    | string  | `""`    | Any entity id (used only when mode=`entity`) |
| `center_unit`      | string  | `""`    | Free text (e.g. `kWh`, `€`)                  |
| `center_decimals`  | number  | `2`     | `0`–`6`                                      |
| `center_font_scale`| number  | `0.4`   | `0.1`–`1.0` (relative to `ring_radius`)      |

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

| Option                 | Type    | Default | Allowed values / range                  |
|------------------------|---------|---------|----------------------------------------|
| `top_label_text`       | string  | `"Donut"` | Any text (empty = no top label)       |
| `top_label_weight`     | number  | `400`   | Typical font-weight (e.g. 300–700)    |
| `top_label_color`      | string  | theme   | CSS color / theme var                  |
| `top_label_font_scale` | number  | `0.35`  | `0.1`–`1.0`                            |
| `top_label_offset_y`   | number  | `0`     | `-100`–`100` (negative = omhoog)       |
| `label_ring_gap`       | number  | `17`    | `0`–`60` (afstand tussen ring en label)|

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

| Option          | Type   | Default | Allowed values / range                          |
|-----------------|--------|---------|------------------------------------------------|
| `ring_radius`   | number | `65`    | `30`–`120` (grotere kaart = grotere radius)    |
| `ring_width`    | number | `8`     | `4`–`40`                                       |
| `ring_offset_y` | number | `0`     | `-60`–`60` (negatief = ring omhoog)           |
| `track_color`   | string | theme   | CSS color                                      |
| `track_opacity` | number | `0.0`   | `0.0`–`1.0` (`0` = geen achtergrondring)       |
| `min_total`     | number | `0`     | Minimum som, daaronder wordt het als 0 gezien |

---

### Segment labels op de donut (optioneel)

```yaml
segment_label_mode: value    # "none" | "value" | "percent" | "both"
segment_label_decimals: 1
segment_label_min_angle: 12  # graden
segment_label_offset: 4      # px buiten de ring
segment_font_scale: 0.18     # 0.05–0.4
```

| Option                  | Type    | Default | Allowed values / range                                |
|-------------------------|---------|---------|------------------------------------------------------|
| `segment_label_mode`    | string  | `value` | `none`, `value`, `percent`, `both`                   |
| `segment_label_decimals`| number  | `1`     | `0`–`6`                                              |
| `segment_label_min_angle`| number | `12`    | `0`–`360` (minimum segmenthoek voor een label)       |
| `segment_label_offset`  | number  | `4`     | Meestal `0`–`20`, afstand buiten de ring             |
| `segment_font_scale`    | number  | `0.18`  | `0.05`–`0.4`                                         |

Bij te kleine segmenten (hoek < `segment_label_min_angle`) wordt het label automatisch weggelaten.

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

| Option                    | Type    | Default | Allowed values / range                                 |
|---------------------------|---------|---------|-------------------------------------------------------|
| `show_legend`             | boolean | `true`  | `true` of `false`                                     |
| `legend_value_mode`       | string  | `both`  | `value`, `percent`, `both`                            |
| `legend_value_decimals`   | number  | `2`     | `0`–`6`                                               |
| `legend_percent_decimals` | number  | `1`     | `0`–`6`                                               |
| `legend_font_scale`       | number  | `0.22`  | `0.05`–`0.4` (relatief t.o.v. `ring_radius`)         |
| `legend_offset_y`         | number  | `0`     | `-80`–`80` (negatief = dichter bij de donut)         |

- **Legenda kleiner/groter** → pas `legend_font_scale` aan.  
- **Afstand tussen donut en legenda** → gebruik `legend_offset_y` (negatief voor compacte kaart).

---

### Segment gaps (YAML only)

```yaml
segment_gap_width: 3          # 0 = no gaps
segment_gap_color: auto       # "auto" of CSS kleur
```

| Option             | Type   | Default | Allowed values / range                              |
|--------------------|--------|---------|----------------------------------------------------|
| `segment_gap_width`| number | `3`     | `0`–`10` (0 = geen gleuven tussen segmenten)       |
| `segment_gap_color`| string | `auto`  | `auto` (= achtergrond) of CSS kleur (`#000`, `var`) |

`auto` probeert de kaartachtergrond te gebruiken zodat de gaps samensmelten met het thema.

---

### Kaart / layout

```yaml
background: var(--ha-card-background, var(--card-background-color))
border_radius: 12px
border: 1px solid var(--ha-card-border-color, rgba(0,0,0,0.12))
box_shadow: none
padding: 0px
max_width: 100%
```

| Option          | Type   | Default | Allowed values / range                     |
|-----------------|--------|---------|-------------------------------------------|
| `background`    | string | theme   | CSS kleur / gradient                      |
| `border_radius` | string | `12px`  | e.g. `0`, `12px`, `1rem`                  |
| `border`        | string | theme   | CSS border string                         |
| `box_shadow`    | string | `none`  | CSS box-shadow                            |
| `padding`       | string | `0px`   | CSS padding                               |
| `max_width`     | string | `100%`  | e.g. `100%`, `520px`                      |

In **sections** kun je eventueel ook nog `layout_options` gebruiken:

```yaml
layout_options:
  grid_rows: auto        # meestal op auto laten
  grid_columns: 4        # aantal kolommen in de sectie
```

---

## Theme integration

De kaart gebruikt Home Assistant theme-variabelen:

- `var(--ha-card-background, var(--card-background-color))` → kaartbackground  
- `var(--primary-text-color)` → tekstkleur  
- `var(--divider-color)` → standaard trackkleur  

Zonder extra styling werkt de kaart in zowel licht als donker thema.

---

## Using in sections (grid layout)

Aanbevolen voorbeeld in een sectie:

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

- Laat `grid_rows` op `auto`  
- Tuning doe je met `ring_radius`, `legend_font_scale`, `legend_offset_y`, enz.

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