/*!
 * 🟢 Donut Chart v2.4.2
 * Multi-segment donut (pizza/taart) voor Home Assistant
 * - Meerdere entiteiten als segmenten
 * - Centertekst: totaal of aparte entiteit
 * - Top-label boven de ring (met schaal + offset)
 * - Theme-aware
 * - Legenda onderaan (aparte decimalen voor waarde & %)
 * - Labels per segment
 * - Rechte gleuven tussen segmenten
 * - UI-editor (ha-form)
 * - SVG-hoogte schaalt mee met ring_radius
 * - Legenda schaalt mee (font + afstand tot donut)
 * - legend_offset_y: afstand donut ↔ legenda (mag negatief)
 */

(() => {
  const TAG = "donut-chart";
  const VERSION = "2.4.2";

  // ---------- helpers ----------

  function clamp(v, min, max) {
    if (!Number.isFinite(v)) return min;
    return Math.max(min, Math.min(max, v));
  }

  // ---------- UI EDITOR ----------

  const LitClass =
    window.LitElement ||
    Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
  const html = LitClass.prototype.html;
  const css = LitClass.prototype.css;

  class DonutChartEditor extends LitClass {
    static get properties() {
      return {
        hass: {},
        _config: {},
        _schema: {},
      };
    }

    constructor() {
      super();
      this._config = {};
      this._schema = [
        {
          name: "top_label_text",
          label: "Top label",
          selector: { text: {} },
        },
        {
          name: "top_label_font_scale",
          label: "Top label grootte (relatief, 0.1–1)",
          selector: { number: { min: 0.1, max: 1, step: 0.05, mode: "box" } },
        },
        {
          name: "top_label_offset_y",
          label: "Top label offset Y (-100 tot 100)",
          selector: { number: { min: -100, max: 100, step: 1, mode: "box" } },
        },
        {
          name: "center_mode",
          label: "Center modus",
          selector: {
            select: {
              options: [
                { value: "total", label: "Totaal van alle segmenten" },
                { value: "entity", label: "Specifieke entiteit" },
                { value: "none", label: "Geen centertekst" },
              ],
            },
          },
        },
        {
          name: "center_entity",
          label: "Center entiteit (bij modus 'entity')",
          selector: { entity: {} },
        },
        {
          name: "center_unit",
          label: "Eenheid centertekst",
          selector: { text: {} },
        },
        {
          name: "center_decimals",
          label: "Decimalen center / totaal",
          selector: { number: { min: 0, max: 6, step: 1, mode: "box" } },
        },
        {
          name: "center_font_scale",
          label: "Grootte centertekst (relatief, 0.1–1)",
          selector: { number: { min: 0.1, max: 1, step: 0.05, mode: "box" } },
        },
        {
          name: "segment_label_mode",
          label: "Labels op de donut",
          selector: {
            select: {
              options: [
                { value: "none", label: "Geen labels" },
                { value: "value", label: "Waarde" },
                { value: "percent", label: "Percentage" },
                { value: "both", label: "Waarde + percentage" },
              ],
            },
          },
        },
        {
          name: "segment_label_decimals",
          label: "Decimalen segment-labels",
          selector: { number: { min: 0, max: 6, step: 1, mode: "box" } },
        },
        {
          name: "show_legend",
          label: "Legenda tonen",
          selector: { boolean: {} },
        },
        {
          name: "legend_value_mode",
          label: "Legenda: wat tonen?",
          selector: {
            select: {
              options: [
                { value: "value", label: "Alleen waarde" },
                { value: "percent", label: "Alleen percentage" },
                { value: "both", label: "Waarde + percentage" },
              ],
            },
          },
        },
        {
          name: "legend_value_decimals",
          label: "Decimalen waarde in legenda",
          selector: { number: { min: 0, max: 6, step: 1, mode: "box" } },
        },
        {
          name: "legend_percent_decimals",
          label: "Decimalen % in legenda",
          selector: { number: { min: 0, max: 6, step: 1, mode: "box" } },
        },
        {
          name: "legend_font_scale",
          label: "Legenda tekstgrootte (relatief, 0.05–0.4)",
          selector: { number: { min: 0.05, max: 0.4, step: 0.01, mode: "box" } },
        },
        {
          name: "legend_offset_y",
          label: "Afstand donut ↔ legenda (-80–80)",
          selector: { number: { min: -80, max: 80, step: 1, mode: "box" } },
        },
        {
          name: "ring_radius",
          label: "Ring radius (30–120)",
          selector: { number: { min: 30, max: 120, step: 1, mode: "box" } },
        },
        {
          name: "ring_width",
          label: "Ring dikte (4–40)",
          selector: { number: { min: 4, max: 40, step: 1, mode: "box" } },
        },
        {
          name: "ring_offset_y",
          label: "Ring offset Y (-60–60)",
          selector: { number: { min: -60, max: 60, step: 1, mode: "box" } },
        },
        {
          name: "label_ring_gap",
          label: "Afstand tussen ring en top label (0–60)",
          selector: { number: { min: 0, max: 60, step: 1, mode: "box" } },
        },
      ];
    }

    setConfig(config) {
      this._config = { ...config };
    }

    _valueChanged(ev) {
      const config = ev.detail.value;
      this._config = config;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: this._config },
          bubbles: true,
          composed: true,
        }),
      );
    }

    render() {
      if (!this.hass || !this._config) return html``;
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._schema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <p style="margin-top:8px; font-size:0.8rem; opacity:0.7;">
          Tip: segmenten (entiteiten + kleuren) stel je in via YAML
          (<code>segments:</code>).
        </p>
      `;
    }

    _computeLabel(schema) {
      return schema.label || schema.name;
    }

    static get styles() {
      return css`
        ha-form {
          --paper-input-container-shared-input-style_-_font-size: 14px;
        }
      `;
    }
  }

  if (!customElements.get("donut-chart-editor")) {
    customElements.define("donut-chart-editor", DonutChartEditor);
  }

  // ---------- KAART ----------

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

        center_mode: "total",
        center_entity: "",
        center_unit: "kWh",
        center_decimals: 2,
        center_font_scale: 0.4,

        top_label_text: "Donut",
        top_label_weight: 400,
        top_label_color: "var(--primary-text-color)",
        text_color_inside: "var(--primary-text-color)",
        top_label_font_scale: 0.35,
        top_label_offset_y: 0,

        ring_radius: 65,
        ring_width: 8,
        ring_offset_y: 0,
        label_ring_gap: 17,

        background: "var(--ha-card-background, var(--card-background-color))",
        border_radius: "12px",
        border: "1px solid var(--ha-card-border-color, rgba(0,0,0,0.12))",
        box_shadow: "none",
        padding: "0px",
        track_color: "var(--divider-color, rgba(127,127,127,0.3))",
        track_opacity: 0.0,
        max_width: "100%",

        min_total: 0,

        show_legend: true,
        legend_value_mode: "both",
        legend_value_decimals: 2,
        legend_percent_decimals: 1,
        legend_font_scale: 0.22,
        legend_offset_y: 0,

        segment_label_mode: "value",
        segment_label_decimals: 1,
        segment_label_min_angle: 12,
        segment_label_offset: 4,
        segment_font_scale: 0.18,

        // Gap blijft configureerbaar via YAML, maar niet in de UI
        segment_gap_width: 3,
        segment_gap_color: "auto",
      };
    }

    static async getConfigElement() {
      return document.createElement("donut-chart-editor");
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

      // Dynamische viewBox-hoogte op basis van radius
      const baseR = 65;
      const baseH = 260;
      const scaleR = R / baseR;
      let vbH = baseH * (0.3 + 0.7 * scaleR);
      if (vbH < 160) vbH = 160;
      if (vbH > 260) vbH = 260;

      const cx = 130;
      const cy = vbH / 2 + Number(c.ring_offset_y || 0);

      const trackOpacity = Number(c.track_opacity ?? 0);
      const hasTrack = trackOpacity > 0;
      const trackColor =
        c.track_color || "var(--divider-color, rgba(127,127,127,0.3))";

      const arcSeg = (a0, a1, sw, color) => {
        const x0 = cx + R * Math.cos(this._toRad(a0));
        const y0 = cy + R * Math.sin(this._toRad(a0));
        const x1 = cx + R * Math.cos(this._toRad(a1));
        const y1 = cy + R * Math.sin(this._toRad(a1));
        const large = a1 - a0 > 180 ? 1 : 0;
        return `<path d="M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}"
                fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="butt"/>`;
      };

      let svg = `
        <svg viewBox="0 0 260 ${vbH}" xmlns="http://www.w3.org/2000/svg">
      `;

      if (hasTrack) {
        svg += `
          <circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
                  stroke="${trackColor}" stroke-width="${W}"
                  opacity="${trackOpacity}"/>
        `;
      }

      if (total > 0 && segs.length) {
        let angleCursor = -90;
        for (const s of segs) {
          const frac = Math.max(0, Math.min(1, s.value / total || 0));
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
        const rawTfs = Number(c.top_label_font_scale);
        const tfs = clamp(rawTfs, 0.1, 1.0) || 0.35;
        const fsTop = R * tfs;

        const baseYTop =
          (cy - R) - (W * 0.8) - fsTop * 0.25 - Number(c.label_ring_gap || 0);

        const rawYOffset = Number(c.top_label_offset_y);
        const yOffset = Number.isFinite(rawYOffset) ? rawYOffset : 0;

        const yTop = baseYTop + yOffset;

        svg += `
          <text x="${cx}" y="${yTop}" font-size="${fsTop}"
                font-weight="${c.top_label_weight || 400}"
                fill="${c.top_label_color || "var(--primary-text-color)"}"
                text-anchor="middle" dominant-baseline="middle">
            ${c.top_label_text}
          </text>
        `;
      }

      // Center tekst
      const centerMode = c.center_mode || "total";
      const textColor = c.text_color_inside || "var(--primary-text-color)";
      const rawCfs = Number(c.center_font_scale);
      const cfs = clamp(rawCfs, 0.1, 1.0) || 0.4;
      const fsCenter = R * cfs;
      let centerText = "";

      if (centerMode === "total") {
        const dRaw = Number(c.center_decimals);
        const decimals = Number.isFinite(dRaw) ? dRaw : 0;
        centerText = `${total.toFixed(decimals)} ${c.center_unit || ""}`.trim();
      } else if (centerMode === "entity" && c.center_entity) {
        const st = h.states?.[c.center_entity];
        if (st) {
          const raw = String(st.state ?? "0").replace(",", ".");
          const v = Number(raw);
          const dRaw = Number(c.center_decimals);
          const d = Number.isFinite(dRaw) ? dRaw : 0;
          const unit = c.center_unit || st.attributes.unit_of_measurement || "";
          centerText = `${isFinite(v) ? v.toFixed(d) : st.state} ${unit}`.trim();
        }
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

      // Labels op segmenten
      const labelMode = c.segment_label_mode || "none";
      if (labelMode !== "none" && total > 0 && segs.length) {
        const decRaw = Number(c.segment_label_decimals);
        const dec = Number.isFinite(decRaw) ? decRaw : 1;
        const minAngleRaw = Number(c.segment_label_min_angle);
        const minAngle = Number.isFinite(minAngleRaw) ? minAngleRaw : 12;
        const offsetRaw = Number(c.segment_label_offset);
        const offset = Number.isFinite(offsetRaw) ? offsetRaw : 4;
        const segFsRaw = Number(c.segment_font_scale);
        const segFontScale = clamp(segFsRaw, 0.05, 0.4) || 0.18;

        const rLabel = R + offset;

        for (const s of segs) {
          if (s._startAngle === undefined || s._endAngle === undefined) continue;
          const span = s._endAngle - s._startAngle;
          if (span <= minAngle) continue;

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
            t = `${valStr}${s.unit ? " " + s.unit : ""} (${pctStr})`;
          }

          svg += `
            <text x="${x}" y="${y}" text-anchor="middle"
                  font-size="${R * segFontScale}" fill="${textColor}"
                  dominant-baseline="middle">
              ${t}
            </text>
          `;
        }
      }

      // Gaps tussen segmenten
      const gapWidth = Number(c.segment_gap_width ?? 0);
      if (gapWidth > 0 && segs.length > 1) {
        let gapColor = c.segment_gap_color;
        if (!gapColor || gapColor === "auto") {
          gapColor =
            c.background ||
            "var(--ha-card-background, var(--card-background-color))";
        }

        const rInner = R - W / 2 - 1;
        const rOuter = R + W / 2 + 1;

        for (const s of segs) {
          if (s._endAngle === undefined) continue;
          const angle = s._endAngle;
          const rad = this._toRad(angle);
          const x0 = cx + rInner * Math.cos(rad);
          const y0 = cy + rInner * Math.sin(rad);
          const x1 = cx + rOuter * Math.cos(rad);
          const y1 = cy + rOuter * Math.sin(rad);

          svg += `
            <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"
                  stroke="${gapColor}" stroke-width="${gapWidth}"
                  stroke-linecap="butt"/>
          `;
        }
      }

      svg += `</svg>`;

      // ----- LEGENDA: schaal + afstand tot donut -----
      const lfRaw = Number(c.legend_font_scale);
      const legendFontScale = clamp(lfRaw, 0.05, 0.4) || 0.22;
      const legendFontSize = Math.max(8, R * legendFontScale);

      const loRaw = Number(c.legend_offset_y);
      let userLegendOffset = Number.isFinite(loRaw) ? loRaw : 0;

      let chartGap = (R - 40) * 0.4 + userLegendOffset;
      if (chartGap < -80) chartGap = -80;
      if (chartGap > 80) chartGap = 80;

      const legendGap = Math.max(2, legendFontSize * 0.3);

      let legendHtml = "";
      const showLegend = c.show_legend !== false;
      const legendMode = c.legend_value_mode || "both";

      if (showLegend && total > 0 && segs.length) {
        const valDecRaw = Number(c.legend_value_decimals);
        const valDec = Number.isFinite(valDecRaw) ? valDecRaw : 1;
        const pctDecRaw = Number(c.legend_percent_decimals);
        const pctDec = Number.isFinite(pctDecRaw) ? pctDecRaw : 1;

        legendHtml = `
          <div class="legend" style="font-size:${legendFontSize}px; gap:${legendGap}px;">
        `;
        for (const s of segs) {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          const pctStr = `${pct.toFixed(pctDec)}%`;
          const valStr = isFinite(s.value) ? s.value.toFixed(valDec) : s.rawState;
          let rightText = "";

          if (legendMode === "value") {
            rightText = `${valStr}${s.unit ? " " + s.unit : ""}`;
          } else if (legendMode === "percent") {
            rightText = pctStr;
          } else {
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
      display: block;
      width: 100%;
      /* geen height: 100%; → laat HA de hoogte bepalen */
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
      height:auto;       /* was 100% */
    }
    .wrap {
      width:100%;
      height:auto;       /* was 100% */
      max-width:${c.max_width || "520px"};
      margin:0 auto;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:flex-start;
    }
    .ring-container {
      width:100%;
      /* flex:1 1 auto;  weg → laat content de hoogte bepalen */
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
    ...
  </style>
`;

      this.shadowRoot.innerHTML = `
        ${style}
        <ha-card>
          <div class="wrap">
            <div class="chart-container" style="margin-bottom:${chartGap}px;">
              ${svg}
            </div>
            ${legendHtml}
          </div>
        </ha-card>
      `;
    }

    getCardSize() {
      return 4;
    }
  }

  try {
    if (!customElements.get("donut-chart")) {
      customElements.define("donut-chart", DonutChart);
    }

    window.customCards = window.customCards || [];
    window.customCards.push({
      type: "donut-chart",
      name: "Donut Chart",
      description:
        "Multi-segment donut chart (meerdere entiteiten als stukken).",
      preview: true,
    });

    console.info(`🟢 ${TAG} v${VERSION} geladen`);
  } catch (e) {
    console.error("❌ Fout bij registratie donut-chart:", e);
  }
})();
