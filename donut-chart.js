/*!
 * 🟢 Donut Chart v5.0
 * Multi-segment donut (pie chart) for Home Assistant
 * - Multiple entities as segments
 * - Each segment: own color + value in the ring
 * - Center text: ALWAYS total of all segments
 * - Top label above the ring
 * - Legend with value / percent / both
 * - Theme-aware, works in sections
 */

(() => {
  const TAG = "donut-chart";
  const VERSION = "5.0";

  const LitBase =
    window.LitElement ||
    Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
  const html = LitBase.prototype.html;
  const css = LitBase.prototype.css;

  class DonutChart extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._config = null;
    }

    static getStubConfig() {
      return {
        segments: [
          { entity: "sensor.example_1", label: "Zone 1", color: "#f97316" },
          { entity: "sensor.example_2", label: "Zone 2", color: "#22c55e" },
          { entity: "sensor.example_3", label: "Zone 3", color: "#3b82f6" },
        ],

        // Center (always total)
        center_unit: "kWh",
        center_decimals: 2,
        center_font_scale: 0.4,

        // Top label
        top_label_text: "Donut",
        top_label_weight: 400,
        top_label_color: "var(--primary-text-color)",
        top_label_font_scale: 0.35,
        top_label_offset_y: 0,
        label_ring_gap: 17,

        // Ring
        ring_radius: 65,
        ring_width: 8,
        ring_offset_y: 0,
        track_color: "var(--divider-color)",
        track_opacity: 0.0,
        min_total: 0,

        // Segment labels
        segment_label_mode: "value", // "none" | "value" | "percent" | "both"
        segment_label_decimals: 1,
        segment_label_min_angle: 12,
        segment_label_offset: 4,
        segment_font_scale: 0.18,
        segment_label_unit: "", // "" = use center_unit

        // Legend
        show_legend: true,
        legend_value_mode: "both",
        legend_value_decimals: 2,
        legend_percent_decimals: 1,
        legend_font_scale: 0.22,
        legend_offset_y: 0,

        // Gaps
        segment_gap_width: 3,
        segment_gap_color: "auto",

        // Card style
        background:
          "var(--ha-card-background, var(--card-background-color, #1c1c1c))",
        border_radius: "12px",
        border:
          "1px solid var(--ha-card-border-color, rgba(0,0,0,0.12))",
        box_shadow: "none",
        padding: "0px",
        max_width: "100%",
      };
    }

    static getConfigElement() {
      return document.createElement("donut-chart-editor");
    }

    setConfig(config) {
      const base = DonutChart.getStubConfig();
      this._config = {
        ...base,
        ...config,
        segments: config.segments || base.segments,
      };
      if (this._hass) this._render();
    }

    set hass(hass) {
      this._hass = hass;
      if (this._config) this._render();
    }

    getCardSize() {
      return 3;
    }

    _clamp(v, a, b) {
      return Math.max(a, Math.min(b, v));
    }

    _toRad(d) {
      return (d * Math.PI) / 180;
    }

    _render() {
      if (!this._config || !this._hass) return;
      const c = this._config;
      const h = this._hass;

      const segDefs = Array.isArray(c.segments) ? c.segments : [];
      if (!segDefs.length) {
        this.shadowRoot.innerHTML =
          `<ha-card><div style="padding:16px;">No segments configured.</div></ha-card>`;
        return;
      }

      const segs = [];
      let total = 0;

      for (const s of segDefs) {
        if (!s || !s.entity) continue;
        const st = h.states?.[s.entity];
        if (!st) continue;
        const raw = String(st.state ?? "0").replace(",", ".");
        let v = Number(raw);
        if (!isFinite(v)) v = 0;
        if (v < 0) v = 0;
        total += v;
        segs.push({
          entity: s.entity,
          label: s.label || s.entity,
          color: s.color || "#ffffff",
          value: v,
          state: st,
        });
      }

      const minTotal = Number(c.min_total ?? 0);
      if (total < minTotal) total = 0;

      const R = Number(c.ring_radius || 65);
      const W = Number(c.ring_width || 8);
      const innerR = R - W;
      const cx = 130;
      const cy = 130 + Number(c.ring_offset_y || 0);
      const trackColor = c.track_color || "var(--divider-color)";
      const trackOpacity = Number(c.track_opacity ?? 0.0);
      const gapWidthPx = Number(c.segment_gap_width || 0);
      const gapColor =
        c.segment_gap_color === "auto" || !c.segment_gap_color
          ? c.background ||
            "var(--ha-card-background, var(--card-background-color))"
          : c.segment_gap_color;

      let gapAngle = 0;
      if (gapWidthPx > 0) {
        const circumference = 2 * Math.PI * ((R + innerR) / 2);
        gapAngle = (gapWidthPx / circumference) * 360;
      }

      const arcPath = (radius, a0, a1) => {
        const x0 = cx + radius * Math.cos(this._toRad(a0));
        const y0 = cy + radius * Math.sin(this._toRad(a0));
        const x1 = cx + radius * Math.cos(this._toRad(a1));
        const y1 = cy + radius * Math.sin(this._toRad(a1));
        const large = a1 - a0 > 180 ? 1 : 0;
        return `M ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1}`;
      };

      let svg = `
        <svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
      `;

      if (trackOpacity > 0) {
        svg += `
          <circle cx="${cx}" cy="${cy}" r="${R - W / 2}" fill="none"
                  stroke="${trackColor}" stroke-width="${W}"
                  opacity="${trackOpacity}" />
        `;
      }

      if (total > 0 && segs.length) {
        let angleCursor = -90;
        for (const s of segs) {
          const frac = this._clamp(s.value / total, 0, 1);
          if (frac <= 0) continue;
          const fullSpan = frac * 360;
          const effectiveSpan =
            fullSpan - (gapAngle > 0 ? gapAngle : 0);
          if (effectiveSpan <= 0) {
            angleCursor += fullSpan;
            continue;
          }
          const start = angleCursor + (gapAngle > 0 ? gapAngle / 2 : 0);
          const end = start + effectiveSpan;
          angleCursor += fullSpan;

          const d = arcPath(R - W / 2, start, end);
          svg += `
            <path d="${d}"
              fill="none"
              stroke="${s.color}"
              stroke-width="${W}"
              stroke-linecap="butt" />
          `;
        }

        if (gapAngle > 0) {
          let boundaryAngle = -90;
          for (const s of segs) {
            const frac = this._clamp(s.value / total, 0, 1);
            if (frac <= 0) continue;
            const fullSpan = frac * 360;

            boundaryAngle += fullSpan;

            const midStart = boundaryAngle - gapAngle / 2;
            const midEnd = boundaryAngle + gapAngle / 2;

            const dGap = arcPath(R - W / 2, midStart, midEnd);
            svg += `
              <path d="${dGap}"
                fill="none"
                stroke="${gapColor}"
                stroke-width="${W}"
                stroke-linecap="butt" />
            `;
          }
        }
      }

      const topText = (c.top_label_text ?? "").trim();
      if (topText) {
        const fsTop = R * (c.top_label_font_scale || 0.35);
        const yTop =
          cy -
          R -
          (W * 0.8) -
          fsTop * 0.25 -
          Number(c.label_ring_gap || 0) +
          Number(c.top_label_offset_y || 0);
        svg += `
          <text x="${cx}" y="${yTop}" font-size="${fsTop}"
                font-weight="${c.top_label_weight || 400}"
                fill="${c.top_label_color || "var(--primary-text-color)"}"
                text-anchor="middle" dominant-baseline="middle">
            ${topText}
          </text>
        `;
      }

      const centerFs = R * (c.center_font_scale || 0.4);
      const centerText = `${total.toFixed(c.center_decimals ?? 0)} ${
        c.center_unit || ""
      }`.trim();

      if (centerText) {
        svg += `
          <text x="${cx}" y="${cy}" text-anchor="middle"
                font-size="${centerFs}" font-weight="400"
                fill="var(--primary-text-color)"
                dominant-baseline="middle">
            ${centerText}
          </text>
        `;
      }

      const segLabelMode = c.segment_label_mode || "value";
      if (segLabelMode !== "none" && total > 0 && segs.length) {
        const fsSeg = R * (c.segment_font_scale || 0.18);
        const offset = Number(c.segment_label_offset || 4);
        const minAngle =
          Number(c.segment_label_min_angle || 12) || 0;
        const unitForSeg =
          (c.segment_label_unit || "").trim() ||
          (c.center_unit || "").trim();
        let angleCursor = -90;

        for (const s of segs) {
          const frac = this._clamp(s.value / total, 0, 1);
          if (frac <= 0) continue;
          const fullSpan = frac * 360;
          const effectiveSpan =
            fullSpan - (gapAngle > 0 ? gapAngle : 0);
          const start = angleCursor + (gapAngle > 0 ? gapAngle / 2 : 0);
          const mid = start + effectiveSpan / 2;
          angleCursor += fullSpan;

          if (effectiveSpan < minAngle) continue;

          const rad = R - W / 2;
          const lx = cx + (rad + offset) * Math.cos(this._toRad(mid));
          const ly = cy + (rad + offset) * Math.sin(this._toRad(mid));

          const rawVal = s.value.toFixed(
            c.segment_label_decimals ?? 0
          );
          const valueStr =
            unitForSeg ? `${rawVal} ${unitForSeg}` : rawVal;
          const percentStr = ((s.value / total) * 100).toFixed(
            c.segment_label_decimals ?? 0
          );

          let labelText = "";
          if (segLabelMode === "value") labelText = `${valueStr}`;
          else if (segLabelMode === "percent")
            labelText = `${percentStr}%`;
          else if (segLabelMode === "both")
            labelText = `${valueStr} (${percentStr}%)`;

          svg += `
            <text x="${lx}" y="${ly}"
                  font-size="${fsSeg}"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  fill="var(--primary-text-color)">
              ${labelText}
            </text>
          `;
        }
      }

      svg += `</svg>`;

      let legendHtml = "";
      if (c.show_legend !== false && total > 0 && segs.length) {
        const fsLegend = R * (c.legend_font_scale || 0.22);
        const mode = c.legend_value_mode || "both";
        const valDec = Number(c.legend_value_decimals ?? 2);
        const pctDec = Number(c.legend_percent_decimals ?? 1);
        const offsetY = Number(c.legend_offset_y || 0);

        const rows = segs
          .map((s) => {
            const pct = total > 0 ? (s.value / total) * 100 : 0;
            const valStr = s.value.toFixed(valDec);
            const pctStr = `${pct.toFixed(pctDec)}%`;
            let right = "";
            if (mode === "value") right = valStr;
            else if (mode === "percent") right = pctStr;
            else right = `${valStr} (${pctStr})`;
            return `
              <div class="legend-row">
                <div class="legend-left">
                  <span class="legend-dot" style="background:${s.color};"></span>
                  <span class="legend-label">${s.label}</span>
                </div>
                <div class="legend-right">${right}</div>
              </div>
            `;
          })
          .join("");

        legendHtml = `
          <div class="legend" style="margin-top:${offsetY}px; font-size:${fsLegend}px;">
            ${rows}
          </div>
        `;
      }

      const style = `
        <style>
          :host {
            display:block;
            width:100%;
            height:100%;
          }
          ha-card {
            background:${c.background};
            border-radius:${c.border_radius};
            border:${c.border};
            box-shadow:${c.box_shadow};
            padding:${c.padding};
            display:flex;
            align-items:stretch;
            justify-content:center;
            width:100%;
            height:100%;
          }
          .wrap {
            width:100%;
            height:100%;
            max-width:${c.max_width || "520px"};
            margin:0 auto;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:flex-start;
          }
          .ring-container {
            width:100%;
            flex:1 1 auto;
            display:flex;
            align-items:center;
            justify-content:center;
          }
          svg {
            width:100%;
            height:auto;
            display:block;
          }
          text {
            user-select:none;
          }
          .legend {
            width:100%;
            flex:0 0 auto;
            display:flex;
            flex-direction:column;
            gap:4px;
            padding:8px 12px 12px 12px;
            box-sizing:border-box;
          }
          .legend-row {
            display:flex;
            align-items:center;
            justify-content:space-between;
            white-space:nowrap;
          }
          .legend-left {
            display:inline-flex;
            align-items:center;
            gap:6px;
            min-width:0;
          }
          .legend-dot {
            width:10px;
            height:10px;
            border-radius:50%;
            flex-shrink:0;
          }
          .legend-label {
            color:var(--primary-text-color);
            overflow:hidden;
            text-overflow:ellipsis;
          }
          .legend-right {
            color:var(--primary-text-color);
            margin-left:8px;
            flex-shrink:0;
          }
        </style>
      `;

      this.shadowRoot.innerHTML = `
        ${style}
        <ha-card>
          <div class="wrap">
            <div class="ring-container">
              ${svg}
            </div>
            ${legendHtml}
          </div>
        </ha-card>
      `;
    }
  }

  class DonutChartEditor extends LitBase {
    static get properties() {
      return {
        hass: {},
        _config: {},
      };
    }

    setConfig(config) {
      this._config = {
        ...DonutChart.getStubConfig(),
        ...config,
      };
    }

    get _defaultConfig() {
      return DonutChart.getStubConfig();
    }

    render() {
      if (!this.hass || !this._config) return html``;
      const data = this._config;

      const schema = [
        // Center
        { name: "center_unit", selector: { text: {} } },
        { name: "center_decimals", selector: { number: { mode: "box" } } },
        { name: "center_font_scale", selector: { number: { mode: "box" } } },

        // Top label
        { name: "top_label_text", selector: { text: {} } },
        { name: "top_label_font_scale", selector: { number: { mode: "box" } } },
        { name: "top_label_offset_y", selector: { number: { mode: "box" } } },

        // Ring
        { name: "ring_radius", selector: { number: { mode: "box" } } },
        { name: "ring_width", selector: { number: { mode: "box" } } },
        { name: "ring_offset_y", selector: { number: { mode: "box" } } },

        // Segment labels
        {
          name: "segment_label_mode",
          selector: {
            select: {
              options: [
                { value: "none", label: "None" },
                { value: "value", label: "Value" },
                { value: "percent", label: "Percent" },
                { value: "both", label: "Value + percent" },
              ],
            },
          },
        },
        { name: "segment_label_unit", selector: { text: {} } },
        { name: "segment_label_decimals", selector: { number: { mode: "box" } } },
        { name: "segment_label_min_angle", selector: { number: { mode: "box" } } },
        { name: "segment_label_offset", selector: { number: { mode: "box" } } },
        { name: "segment_font_scale", selector: { number: { mode: "box" } } },

        // Legend
        { name: "show_legend", selector: { boolean: {} } },
        {
          name: "legend_value_mode",
          selector: {
            select: {
              options: [
                { value: "value", label: "Value only" },
                { value: "percent", label: "Percent only" },
                { value: "both", label: "Value + percent" },
              ],
            },
          },
        },
        { name: "legend_value_decimals", selector: { number: { mode: "box" } } },
        {
          name: "legend_percent_decimals",
          selector: { number: { mode: "box" } },
        },
        { name: "legend_font_scale", selector: { number: { mode: "box" } } },
        { name: "legend_offset_y", selector: { number: { mode: "box" } } },
      ];

      return html`
        <div class="card-config">
          <p>
            <b>Note:</b> segments (entities, labels, colors) are defined in YAML
            under <code>segments:</code>.
          </p>
          <ha-form
            .hass=${this.hass}
            .data=${data}
            .schema=${schema}
            .computeLabel=${this._computeLabel.bind(this)}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
      `;
    }

    _computeLabel(schema) {
      switch (schema.name) {
        case "center_unit":
          return "Center: unit (total of all segments)";
        case "center_decimals":
          return "Center: decimals";
        case "center_font_scale":
          return "Center: font scale";

        case "top_label_text":
          return "Top label: text";
        case "top_label_font_scale":
          return "Top label: font scale";
        case "top_label_offset_y":
          return "Top label: vertical offset";

        case "ring_radius":
          return "Ring radius";
        case "ring_width":
          return "Ring width";
        case "ring_offset_y":
          return "Ring vertical offset";

        case "segment_label_mode":
          return "Segment labels: mode";
        case "segment_label_unit":
          return "Segment labels: unit (empty = center unit)";
        case "segment_label_decimals":
          return "Segment labels: decimals";
        case "segment_label_min_angle":
          return "Segment labels: minimum angle";
        case "segment_label_offset":
          return "Segment labels: distance from ring";
        case "segment_font_scale":
          return "Segment labels: font scale";

        case "show_legend":
          return "Show legend";
        case "legend_value_mode":
          return "Legend: what to show";
        case "legend_value_decimals":
          return "Legend value: decimals";
        case "legend_percent_decimals":
          return "Legend percent: decimals";
        case "legend_font_scale":
          return "Legend: font scale";
        case "legend_offset_y":
          return "Legend: vertical offset";
        default:
          return schema.name || "";
      }
    }

    _valueChanged(ev) {
      const newConfig = ev.detail.value;
      this._config = newConfig;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: newConfig },
        })
      );
    }

    static get styles() {
      return css`
        .card-config {
          padding: 16px;
        }
        p {
          margin-top: 0;
          margin-bottom: 16px;
        }
      `;
    }
  }

  try {
    if (!customElements.get(TAG)) {
      customElements.define(TAG, DonutChart);
      customElements.define("donut-chart-editor", DonutChartEditor);
      window.customCards = window.customCards || [];
      window.customCards.push({
        type: TAG,
        name: "Donut Chart",
        description:
          "Fast multi-segment donut / pie chart for Home Assistant.",
        preview: true,
      });
      console.info(
        `%c🟢 ${TAG} %cv${VERSION} loaded`,
        "color:#22c55e;font-weight:bold;",
        "color:inherit;"
      );
    }
  } catch (e) {
    console.error("❌ Error registering donut-chart:", e);
  }
})();
