/*!
 * 🟢 Donut Chart v1.2.0
 * Multi-segment donut (pizza/taart) voor Home Assistant
 * - Meerdere entiteiten als segmenten
 * - Elke entiteit: eigen kleur + verhouding in de ring
 * - Centertekst: totaal of aparte entiteit
 * - Top-label boven de ring
 * - Theme-aware, YAML only
 * - Legenda onderaan
 * - Optioneel: labels op de donut per segment (waarde / % / beide)
 */

(() => {
  const TAG = "donut-chart";
  const VERSION = "1.2.0";

  class DonutChart extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._config = null;
    }

    static getStubConfig() {
      return {
        // Voorbeeldsegments
        segments: [
          { entity: "sensor.example_1", label: "Zone 1", color: "#f97316" },
          { entity: "sensor.example_2", label: "Zone 2", color: "#22c55e" },
          { entity: "sensor.example_3", label: "Zone 3", color: "#3b82f6" },
        ],

        // Centertekst
        center_mode: "total",      // "total" | "entity" | "none"
        center_entity: "",         // gebruikt als center_mode "entity" is
        center_unit: "kWh",
        center_decimals: 2,

        // Top label
        top_label_text: "Donut",
        top_label_weight: 400,
        top_label_color: "#ffffff",
        text_color_inside: "#ffffff",

        // Ring layout
        ring_radius: 65,
        ring_width: 8,
        ring_offset_y: 0,
        label_ring_gap: 17,

        // Kaartstijl
        background: "var(--card-background-color)",
        border_radius: "12px",
        border: "1px solid rgba(255,255,255,0.2)",
        box_shadow: "none",
        padding: "0px",
        track_color: "#000000",
        track_opacity: 0.3, // lichte achtergrondring

        // Optioneel: minimum totaal
        min_total: 0,

        // Legenda
        show_legend: true,
        legend_value_mode: "both", // "value" | "percent" | "both"

        // Labels op de donut per segment
        segment_label_mode: "none",     // "none" | "value" | "percent" | "both"
        segment_label_decimals: 1,      // decimalen voor labels
        segment_label_min_angle: 12,    // min. hoek in graden om label te tonen
        segment_label_offset: 4,        // afstand buiten de ring
      };
    }

    setConfig(config) {
      const base = DonutChart.getStubConfig();
      this._config = {
        ...base,
        ...config,
        segments: config.segments || base.segments,
      };
    }

    set hass(hass) {
      this._hass = hass;
      this._render();
    }

    // Helpers
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
      if (!segDefs.length) return;

      const segs = [];
      let total = 0;

      // Waardes per segment ophalen
      for (const s of segDefs) {
        if (!s || !s.entity) continue;
        const st = h.states?.[s.entity];
        if (!st) continue;
        const raw = String(st.state ?? "0").replace(",", ".");
        let v = Number(raw);
        if (!isFinite(v)) v = 0;
        if (v < 0) v = 0;   // geen negatieve stukken
        total += v;
        segs.push({
          entity: s.entity,
          label: s.label || s.entity,
          color: s.color || "#ffffff",
          value: v,
          unit: st.attributes?.unit_of_measurement || "",
          rawState: st.state,
        });
      }

      const minTotal = Number(c.min_total ?? 0);
      if (total < minTotal) {
        total = 0;
      }

      const R = Number(c.ring_radius || 65);
      const W = Number(c.ring_width || 8);
      const cx = 130;
      const cy = 130 + Number(c.ring_offset_y || 0);
      const trackColor = c.track_color || "#000000";
      const trackOpacity = Number(c.track_opacity ?? 0.3);

      const arcSeg = (a0, a1, sw, color) => {
        const x0 = cx + R * Math.cos(this._toRad(a0));
        const y0 = cy + R * Math.sin(this._toRad(a0));
        const x1 = cx + R * Math.cos(this._toRad(a1));
        const y1 = cy + R * Math.sin(this._toRad(a1));
        const large = (a1 - a0) > 180 ? 1 : 0;
        return `<path d="M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}"
                fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
      };

      // SVG start
      let svg = `
        <svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
          <!-- track ring -->
          <circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
                  stroke="${trackColor}" stroke-width="${W}"
                  opacity="${trackOpacity}"/>
      `;

      // Segmenten tekenen + hoeken bewaren
      if (total > 0 && segs.length) {
        let angleCursor = -90; // start bovenaan
        for (const s of segs) {
          const frac = this._clamp(s.value / total, 0, 1);
          const span = frac * 360;
          if (span <= 0) {
            s._startAngle = s._endAngle = angleCursor;
            continue;
          }
          const start = angleCursor;
          const end = angleCursor + span;
          angleCursor = end;

          s._startAngle = start;
          s._endAngle = end;

          svg += arcSeg(start, end, W, s.color);
        }
      }

      // Top label
      if ((c.top_label_text ?? "").trim() !== "") {
        const fsTop = R * 0.35;
        const yTop =
          (cy - R) - (W * 0.8) - fsTop * 0.25 - Number(c.label_ring_gap || 0);
        svg += `
          <text x="${cx}" y="${yTop}" font-size="${fsTop}"
                font-weight="${c.top_label_weight || 400}"
                fill="${c.top_label_color || "#ffffff"}"
                text-anchor="middle" dominant-baseline="middle">
            ${c.top_label_text}
          </text>
        `;
      }

      // Center tekst (totaal / entity / none)
      const centerMode = c.center_mode || "total";
      const textColor = c.text_color_inside || "#ffffff";
      const fsCenter = R * 0.40;
      let centerText = "";

      if (centerMode === "total") {
        const decimals = Number.isFinite(Number(c.center_decimals))
          ? Number(c.center_decimals)
          : 0;
        centerText = `${total.toFixed(decimals)} ${c.center_unit || ""}`.trim();
      } else if (centerMode === "entity" && c.center_entity) {
        const st = h.states?.[c.center_entity];
        if (st) {
          const raw = String(st.state ?? "0").replace(",", ".");
          const v = Number(raw);
          const d = Number(c.center_decimals ?? 0);
          const unit =
            c.center_unit ||
            st.attributes.unit_of_measurement ||
            "";
          centerText = `${isFinite(v) ? v.toFixed(d) : st.state} ${unit}`.trim();
        }
      } else {
        centerText = "";
      }

      if (centerText) {
        svg += `
          <text x="${cx}" y="${cy}" text-anchor="middle"
                font-size="${fsCenter}" font-weight="400"
                fill="${textColor}" dominant-baseline="middle">
            ${centerText}
          </text>
        `;
      }

      // Labels op de donut zelf
      const labelMode = c.segment_label_mode || "none";
      if (labelMode !== "none" && total > 0 && segs.length) {
        const dec = Number.isFinite(Number(c.segment_label_decimals))
          ? Number(c.segment_label_decimals)
          : 1;
        const minAngle = Number.isFinite(Number(c.segment_label_min_angle))
          ? Number(c.segment_label_min_angle)
          : 12;
        const offset =
          Number.isFinite(Number(c.segment_label_offset)) ?
          Number(c.segment_label_offset) : 4;

        const rLabel = R + offset;

        for (const s of segs) {
          if (s._startAngle === undefined || s._endAngle === undefined) continue;
          const span = s._endAngle - s._startAngle;
          if (span <= minAngle) continue; // te klein stuk => geen label

          const mid = s._startAngle + span / 2;
          const rad = this._toRad(mid);
          const x = cx + rLabel * Math.cos(rad);
          const y = cy + rLabel * Math.sin(rad);

          const pct = total > 0 ? (s.value / total) * 100 : 0;
          const pctStr = `${pct.toFixed(dec)}%`;
          const valStr = isFinite(s.value) ? s.value.toFixed(dec) : s.rawState;

          let t = "";
          if (labelMode === "percent") {
            t = pctStr;
          } else if (labelMode === "value") {
            t = `${valStr}${s.unit ? " " + s.unit : ""}`;
          } else {
            // both
            t = `${valStr}${s.unit ? " " + s.unit : ""} (${pctStr})`;
          }

          svg += `
            <text x="${x}" y="${y}" text-anchor="middle"
                  font-size="${R * 0.18}" fill="${textColor}"
                  dominant-baseline="middle">
              ${t}
            </text>
          `;
        }
      }

      svg += `</svg>`;

      // Legenda onderaan
      let legendHtml = "";
      const showLegend = c.show_legend !== false;
      const legendMode = c.legend_value_mode || "both";

      if (showLegend && total > 0 && segs.length) {
        const dec = Number.isFinite(Number(c.center_decimals))
          ? Number(c.center_decimals)
          : 1;

        legendHtml = `<div class="legend">`;
        for (const s of segs) {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          const pctStr = `${pct.toFixed(1)}%`;
          const valStr = isFinite(s.value) ? s.value.toFixed(dec) : s.rawState;
          let rightText = "";

          if (legendMode === "value") {
            rightText = `${valStr}${s.unit ? " " + s.unit : ""}`;
          } else if (legendMode === "percent") {
            rightText = pctStr;
          } else {
            // both
            rightText = `${valStr}${s.unit ? " " + s.unit : ""} (${pctStr})`;
          }

          legendHtml += `
            <div class="legend-item">
              <span class="legend-color" style="background:${s.color};"></span>
              <span class="legend-label">${s.label}</span>
              <span class="legend-value">${rightText}</span>
            </div>
          `;
        }
        legendHtml += `</div>`;
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
            width:100%;
            height:100%;
            box-sizing:border-box;
          }
          .wrap {
            width:100%;
            height:100%;
            max-width:520px;
            margin:0 auto;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            position:relative;
            box-sizing:border-box;
            padding:8px 10px 10px 10px;
            gap:6px;
          }
          .chart-container {
            width:100%;
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
            display:flex;
            flex-direction:column;
            gap:4px;
            margin-top:4px;
            font-size:0.85rem;
          }
          .legend-item {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:8px;
          }
          .legend-color {
            width:10px;
            height:10px;
            border-radius:50%;
            flex-shrink:0;
          }
          .legend-label {
            flex:1 1 auto;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
          }
          .legend-value {
            flex-shrink:0;
            text-align:right;
            font-variant-numeric:tabular-nums;
          }
        </style>
      `;

      this.shadowRoot.innerHTML = `
        ${style}
        <ha-card>
          <div class="wrap">
            <div class="chart-container">
              ${svg}
            </div>
            ${legendHtml}
          </div>
        </ha-card>
      `;
    }

    getCardSize() {
      // iets hoger door legenda + labels
      return 4;
    }
  }

  try {
    if (!customElements.get("donut-chart")) {
      customElements.define("donut-chart", DonutChart);
      // Registratie voor kaart-picker (optioneel)
      window.customCards = window.customCards || [];
      window.customCards.push({
        type: "donut-chart",
        name: "Donut Chart",
        description: "Multi-segment donut chart (meerdere entiteiten als stukken).",
        preview: true,
      });
      console.info(`🟢 ${TAG} v${VERSION} geladen`);
    }
  } catch (e) {
    console.error("❌ Fout bij registratie donut-chart:", e);
  }
})();
