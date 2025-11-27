/*!
 * 🟢 Donut Chart v2.2.0
 * Multi-segment donut (pizza/taart) voor Home Assistant
 * - Meerdere entiteiten als segmenten
 * - Centertekst: totaal of aparte entiteit
 * - Top-label boven de ring (met schaal + offset)
 * - Theme-aware
 * - Legenda onderaan (aparte decimalen voor %)
 * - Labels per segment
 * - Rechte gleuven tussen segmenten
 * - UI-editor (ha-form)
 * - SVG-hoogte schaalt mee met ring_radius
 * - Legenda schaalt mee (font + afstand tot donut)
 * - Home Assistant Section Views compatibility
 * - Improved error handling and validation
 * - Loading states and fallback UI
 * - Optimized SVG rendering for large datasets
 */

(() => {
  // =========================================================================
  // CONSTANTS - Refactored magic numbers for better configurability
  // =========================================================================
  
  /** @constant {string} TAG - Custom element tag name */
  const TAG = "donut-chart";
  
  /** @constant {string} VERSION - Current version of the component */
  const VERSION = "2.2.0";
  
  /** @constant {number} BASE_RADIUS - Default ring radius used for scaling calculations */
  const BASE_RADIUS = 65;
  
  /** @constant {number} BASE_HEIGHT - Default viewBox height for SVG calculations */
  const BASE_HEIGHT = 260;
  
  /** @constant {number} VIEWBOX_WIDTH - Fixed SVG viewBox width */
  const VIEWBOX_WIDTH = 260;
  
  /** @constant {number} MIN_VIEWBOX_HEIGHT - Minimum allowed viewBox height */
  const MIN_VIEWBOX_HEIGHT = 180;
  
  /** @constant {number} MAX_VIEWBOX_HEIGHT - Maximum allowed viewBox height */
  const MAX_VIEWBOX_HEIGHT = 260;
  
  /** @constant {number} CENTER_X - X coordinate for the center of the donut */
  const CENTER_X = 130;
  
  /** @constant {number} MAX_SEGMENTS_FOR_OPTIMIZATION - Threshold for applying rendering optimizations */
  const MAX_SEGMENTS_FOR_OPTIMIZATION = 50;
  
  /** @constant {number} DEG_TO_RAD - Conversion factor from degrees to radians */
  const DEG_TO_RAD = Math.PI / 180;
  
  /** @constant {number} MIN_SEGMENT_SPAN_DEGREES - Minimum segment span in degrees for rendering in large datasets */
  const MIN_SEGMENT_SPAN_DEGREES = 0.5;
  
  /** @constant {number} MIN_RING_RADIUS - Minimum allowed ring radius */
  const MIN_RING_RADIUS = 10;
  
  /** @constant {number} MAX_RING_RADIUS - Maximum allowed ring radius */
  const MAX_RING_RADIUS = 200;
  
  /** @constant {number} MIN_RING_WIDTH - Minimum allowed ring width */
  const MIN_RING_WIDTH = 1;
  
  /** @constant {number} MAX_RING_WIDTH - Maximum allowed ring width */
  const MAX_RING_WIDTH = 100;

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================
  
  /**
   * Safely logs messages with component prefix
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments to log
   */
  const log = (level, message, ...args) => {
    const prefix = `🟢 ${TAG}:`;
    if (level === 'error') {
      console.error(prefix, message, ...args);
    } else if (level === 'warn') {
      console.warn(prefix, message, ...args);
    } else {
      console.info(prefix, message, ...args);
    }
  };

  /**
   * Clamps a value between minimum and maximum bounds
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum bound
   * @param {number} max - Maximum bound
   * @returns {number} Clamped value
   */
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  /**
   * Converts degrees to radians
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  const toRadians = (degrees) => degrees * DEG_TO_RAD;

  /**
   * Safely parses a numeric value from various input types
   * Handles European decimal notation (comma as decimal separator)
   * but preserves thousand separators when detected
   * @param {any} value - Value to parse
   * @param {number} defaultValue - Default value if parsing fails
   * @returns {number} Parsed numeric value or default
   */
  const safeParseNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined) return defaultValue;
    
    let strValue = String(value).trim();
    
    // Check if this looks like a number with thousand separators (e.g., "1,000.00" or "1.000,00")
    // If there are multiple commas or periods, it's likely using thousand separators
    const commaCount = (strValue.match(/,/g) || []).length;
    const periodCount = (strValue.match(/\./g) || []).length;
    
    if (commaCount === 1 && periodCount === 0) {
      // Single comma, no periods - likely European decimal (e.g., "1,5")
      strValue = strValue.replace(",", ".");
    } else if (commaCount > 1 || (commaCount === 1 && periodCount >= 1)) {
      // Multiple commas or both comma and period - try to detect format
      const lastComma = strValue.lastIndexOf(',');
      const lastPeriod = strValue.lastIndexOf('.');
      
      if (lastComma > lastPeriod) {
        // European format: 1.000,00 -> 1000.00
        strValue = strValue.replace(/\./g, '').replace(',', '.');
      } else {
        // US format: 1,000.00 -> 1000.00
        strValue = strValue.replace(/,/g, '');
      }
    }
    
    const parsed = Number(strValue);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  };

  /**
   * Validates segment configuration
   * @param {Object} segment - Segment configuration object
   * @returns {Object} Validation result with isValid flag and errors array
   */
  const validateSegment = (segment) => {
    const errors = [];
    if (!segment) {
      errors.push("Segment is null or undefined");
      return { isValid: false, errors };
    }
    if (!segment.entity || typeof segment.entity !== 'string') {
      errors.push(`Invalid entity: ${segment.entity}`);
    }
    return { isValid: errors.length === 0, errors };
  };

  /**
   * Validates the entire configuration object
   * @param {Object} config - Configuration object to validate
   * @returns {Object} Validation result with isValid flag and errors array
   */
  const validateConfig = (config) => {
    const errors = [];
    
    if (!config) {
      errors.push("Configuration is null or undefined");
      return { isValid: false, errors };
    }
    
    if (!Array.isArray(config.segments)) {
      errors.push("Segments must be an array");
    } else if (config.segments.length === 0) {
      errors.push("At least one segment is required");
    } else {
      config.segments.forEach((seg, idx) => {
        const result = validateSegment(seg);
        if (!result.isValid) {
          errors.push(`Segment ${idx}: ${result.errors.join(", ")}`);
        }
      });
    }
    
    // Validate numeric properties are within reasonable bounds
    if (config.ring_radius !== undefined) {
      const radius = safeParseNumber(config.ring_radius);
      if (radius < MIN_RING_RADIUS || radius > MAX_RING_RADIUS) {
        errors.push(`ring_radius should be between ${MIN_RING_RADIUS} and ${MAX_RING_RADIUS}, got ${radius}`);
      }
    }
    
    if (config.ring_width !== undefined) {
      const width = safeParseNumber(config.ring_width);
      if (width < MIN_RING_WIDTH || width > MAX_RING_WIDTH) {
        errors.push(`ring_width should be between ${MIN_RING_WIDTH} and ${MAX_RING_WIDTH}, got ${width}`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  };

  // =========================================================================
  // UI EDITOR
  // =========================================================================

  const LitClass =
    window.LitElement ||
    Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
  const html = LitClass.prototype.html;
  const css = LitClass.prototype.css;

  /**
   * DonutChartEditor - Visual editor for donut chart configuration
   * Provides a form-based UI for configuring chart properties
   * @extends LitElement
   */
  class DonutChartEditor extends LitClass {
    /**
     * @static
     * @returns {Object} Properties definition for Lit element reactivity
     */
    static get properties() {
      return {
        hass: {},
        _config: {},
        _schema: {},
      };
    }

    /**
     * Creates an instance of DonutChartEditor
     * Initializes configuration and schema for the form
     */
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
          label: "Top label grootte (relatief)",
          selector: { number: { min: 0.1, max: 1, step: 0.05 } },
        },
        {
          name: "top_label_offset_y",
          label: "Top label offset Y",
          selector: { number: { min: -50, max: 50, step: 1 } },
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
          label: "Decimalen center / waarden",
          selector: { number: { min: 0, max: 4, step: 1 } },
        },
        {
          name: "center_font_scale",
          label: "Grootte centertekst (relatief)",
          selector: { number: { min: 0.1, max: 1, step: 0.05 } },
        },
        {
          name: "segment_gap_width",
          label: "Breedte gap tussen segmenten (px)",
          selector: { number: { min: 0, max: 12, step: 1 } },
        },
        {
          name: "segment_gap_color",
          label: "Kleur gap (auto = kaartachtergrond)",
          selector: { text: {} },
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
          selector: { number: { min: 0, max: 4, step: 1 } },
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
          name: "legend_percent_decimals",
          label: "Decimalen percentage in legenda",
          selector: { number: { min: 0, max: 4, step: 1 } },
        },
        {
          name: "legend_font_scale",
          label: "Legenda tekstgrootte (relatief t.o.v. radius)",
          selector: { number: { min: 0.05, max: 0.4, step: 0.01 } },
        },
        {
          name: "ring_radius",
          label: "Ring radius",
          selector: { number: { min: 30, max: 120, step: 1 } },
        },
        {
          name: "ring_width",
          label: "Ring dikte",
          selector: { number: { min: 4, max: 40, step: 1 } },
        },
        {
          name: "ring_offset_y",
          label: "Ring offset Y",
          selector: { number: { min: -60, max: 60, step: 1 } },
        },
        {
          name: "label_ring_gap",
          label: "Afstand tussen ring en top label",
          selector: { number: { min: 0, max: 60, step: 1 } },
        },
        {
          name: "max_width",
          label: "Max breedte donut (bv. 100% of 420px)",
          selector: { text: {} },
        },
        {
          name: "background",
          label: "Kaart achtergrond (optioneel)",
          selector: { text: {} },
        },
      ];
    }

    /**
     * Sets the configuration for the editor
     * @param {Object} config - Configuration object
     */
    setConfig(config) {
      this._config = { ...config };
    }

    /**
     * Handles value change events from the form
     * @param {CustomEvent} ev - Value changed event from ha-form
     * @private
     */
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

    /**
     * Renders the editor form
     * @returns {TemplateResult} Lit HTML template
     */
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
          Tip: segmenten (entiteiten + kleuren) blijven voorlopig via YAML
          (<code>segments:</code>).
        </p>
      `;
    }

    /**
     * Computes the label text for a form field
     * @param {Object} schema - Schema object with label and name properties
     * @returns {string} Label text to display
     * @private
     */
    _computeLabel(schema) {
      return schema.label || schema.name;
    }

    /**
     * @static
     * @returns {CSSResult} Component styles
     */
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

  // =========================================================================
  // MAIN DONUT CHART COMPONENT
  // =========================================================================

  /**
   * DonutChart - Home Assistant custom card for displaying donut/pie charts
   * Supports multiple segments, legends, labels, and Section Views compatibility
   * @extends HTMLElement
   */
  class DonutChart extends HTMLElement {
    /**
     * Creates an instance of DonutChart
     * Initializes shadow DOM and internal state
     */
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._config = null;
      this._isLoading = true;
      this._lastError = null;
    }

    /**
     * Gets the default stub configuration for new cards
     * @static
     * @returns {Object} Default configuration object
     */
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
        legend_percent_decimals: 1,
        legend_font_scale: 0.22,   // relatief t.o.v. radius

        segment_label_mode: "value",
        segment_label_decimals: 1,
        segment_label_min_angle: 12,
        segment_label_offset: 4,
        segment_font_scale: 0.18,

        segment_gap_width: 3,
        segment_gap_color: "auto",
        
        // Section Views compatibility options
        section_view_mode: false,
        section_donut_container: null,
        section_legend_container: null,
        section_center_container: null,
      };
    }

    /**
     * Gets the configuration element for the visual editor
     * @static
     * @async
     * @returns {Promise<HTMLElement>} Editor element
     */
    static async getConfigElement() {
      return document.createElement("donut-chart-editor");
    }

    /**
     * Sets and validates the configuration for the card
     * @param {Object} config - User-provided configuration
     * @throws {Error} If configuration is invalid
     */
    setConfig(config) {
      // Validate configuration
      const validation = validateConfig(config);
      if (!validation.isValid) {
        log('warn', 'Configuration validation warnings:', validation.errors);
      }
      
      const base = DonutChart.getStubConfig();
      this._config = {
        ...base,
        ...config,
        segments: config.segments || base.segments,
      };
      this._isLoading = false;
    }

    /**
     * Sets the Home Assistant object and triggers re-render
     * @param {Object} hass - Home Assistant object containing states
     */
    set hass(hass) {
      this._hass = hass;
      this._isLoading = false;
      this._render();
    }

    /**
     * Generates SVG arc path segment
     * @param {number} a0 - Start angle in degrees
     * @param {number} a1 - End angle in degrees
     * @param {number} sw - Stroke width
     * @param {string} color - Stroke color
     * @param {number} R - Radius
     * @param {number} cx - Center X coordinate
     * @param {number} cy - Center Y coordinate
     * @returns {string} SVG path element string
     * @private
     */
    _arcSegment(a0, a1, sw, color, R, cx, cy) {
      const x0 = cx + R * Math.cos(toRadians(a0));
      const y0 = cy + R * Math.sin(toRadians(a0));
      const x1 = cx + R * Math.cos(toRadians(a1));
      const y1 = cy + R * Math.sin(toRadians(a1));
      const large = a1 - a0 > 180 ? 1 : 0;
      return `<path d="M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}"
              fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="butt"/>`;
    }

    /**
     * Generates loading state UI
     * @returns {string} HTML string for loading state
     * @private
     */
    _renderLoadingState() {
      return `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <span>Loading chart data...</span>
        </div>
      `;
    }

    /**
     * Generates error state UI
     * @param {string} message - Error message to display
     * @returns {string} HTML string for error state
     * @private
     */
    _renderErrorState(message) {
      return `
        <div class="error-state">
          <span class="error-icon">⚠️</span>
          <span class="error-message">${message}</span>
        </div>
      `;
    }

    /**
     * Generates empty/no-data state UI
     * @returns {string} HTML string for empty state
     * @private
     */
    _renderEmptyState() {
      return `
        <div class="empty-state">
          <span class="empty-icon">📊</span>
          <span class="empty-message">No data available</span>
        </div>
      `;
    }

    /**
     * Processes segment definitions and calculates values from entity states
     * @param {Array} segDefs - Segment definitions from config
     * @param {Object} states - Home Assistant entity states
     * @returns {Object} Object containing processed segments and total
     * @private
     */
    _processSegments(segDefs, states) {
      const segs = [];
      let total = 0;
      const errors = [];

      for (const s of segDefs) {
        if (!s || !s.entity) {
          errors.push('Invalid segment definition (missing entity)');
          continue;
        }
        
        const st = states?.[s.entity];
        if (!st) {
          log('warn', `Entity not found: ${s.entity}`);
          // Add segment with zero value instead of skipping
          segs.push({
            entity: s.entity,
            label: s.label || s.entity,
            color: s.color || "#cccccc",
            value: 0,
            unit: "",
            rawState: "unavailable",
            isUnavailable: true,
          });
          continue;
        }
        
        const raw = String(st.state ?? "0").replace(",", ".");
        let v = safeParseNumber(raw, 0);
        if (v < 0) v = 0;
        total += v;
        
        segs.push({
          entity: s.entity,
          label: s.label || s.entity,
          color: s.color || "#ffffff",
          value: v,
          unit: st.attributes?.unit_of_measurement || "",
          rawState: st.state,
          isUnavailable: false,
        });
      }

      return { segs, total, errors };
    }

    /**
     * Renders the donut chart SVG with optimizations for large datasets
     * @param {Array} segs - Processed segments
     * @param {number} total - Total value of all segments
     * @param {Object} c - Configuration object
     * @returns {string} SVG markup string
     * @private
     */
    _renderDonutSvg(segs, total, c) {
      const R = safeParseNumber(c.ring_radius, BASE_RADIUS);
      const W = safeParseNumber(c.ring_width, 8);

      // Dynamic viewBox height based on radius using constants
      const extra = BASE_HEIGHT - 2 * BASE_RADIUS;
      let vbH = clamp(2 * R + extra, MIN_VIEWBOX_HEIGHT, MAX_VIEWBOX_HEIGHT);

      const cx = CENTER_X;
      const cy = vbH / 2 + safeParseNumber(c.ring_offset_y, 0);

      const trackOpacity = safeParseNumber(c.track_opacity, 0);
      const hasTrack = trackOpacity > 0;
      const trackColor = c.track_color || "var(--divider-color, rgba(127,127,127,0.3))";

      // Use DocumentFragment pattern for better performance with large datasets
      const svgParts = [];
      
      svgParts.push(`<svg viewBox="0 0 ${VIEWBOX_WIDTH} ${vbH}" xmlns="http://www.w3.org/2000/svg">`);

      // Track circle (background)
      if (hasTrack) {
        svgParts.push(`
          <circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
                  stroke="${trackColor}" stroke-width="${W}"
                  opacity="${trackOpacity}"/>
        `);
      }

      // Render segments with optimization for large datasets
      if (total > 0 && segs.length) {
        let angleCursor = -90;
        const isLargeDataset = segs.length > MAX_SEGMENTS_FOR_OPTIMIZATION;
        
        for (const s of segs) {
          const frac = clamp(s.value / total, 0, 1);
          const span = frac * 360;
          
          if (span <= 0) {
            s._startAngle = s._endAngle = angleCursor;
            continue;
          }
          
          // Skip very small segments for large datasets (optimization)
          if (isLargeDataset && span < MIN_SEGMENT_SPAN_DEGREES) {
            s._startAngle = s._endAngle = angleCursor;
            angleCursor += span;
            continue;
          }
          
          const start = angleCursor;
          const end = angleCursor + span;
          angleCursor = end;
          s._startAngle = start;
          s._endAngle = end;
          svgParts.push(this._arcSegment(start, end, W, s.color, R, cx, cy));
        }
      }

      // Top label
      if ((c.top_label_text ?? "").trim() !== "") {
        const tfs = safeParseNumber(c.top_label_font_scale, 0.35);
        const fsTop = R * tfs;
        const baseYTop = (cy - R) - (W * 0.8) - fsTop * 0.25 - safeParseNumber(c.label_ring_gap, 0);
        const yOffset = safeParseNumber(c.top_label_offset_y, 0);
        const yTop = baseYTop + yOffset;

        svgParts.push(`
          <text x="${cx}" y="${yTop}" font-size="${fsTop}"
                font-weight="${c.top_label_weight || 400}"
                fill="${c.top_label_color || "var(--primary-text-color)"}"
                text-anchor="middle" dominant-baseline="middle">
            ${this._escapeHtml(c.top_label_text)}
          </text>
        `);
      }

      // Center text
      const centerMode = c.center_mode || "total";
      const textColor = c.text_color_inside || "var(--primary-text-color)";
      const cfs = safeParseNumber(c.center_font_scale, 0.4);
      const fsCenter = R * cfs;
      let centerText = "";

      if (centerMode === "total") {
        const decimals = safeParseNumber(c.center_decimals, 0);
        centerText = `${total.toFixed(decimals)} ${c.center_unit || ""}`.trim();
      } else if (centerMode === "entity" && c.center_entity) {
        const st = this._hass?.states?.[c.center_entity];
        if (st) {
          const raw = String(st.state ?? "0").replace(",", ".");
          const v = safeParseNumber(raw, 0);
          const d = safeParseNumber(c.center_decimals, 0);
          const unit = c.center_unit || st.attributes?.unit_of_measurement || "";
          centerText = `${Number.isFinite(v) ? v.toFixed(d) : st.state} ${unit}`.trim();
        } else {
          log('warn', `Center entity not found: ${c.center_entity}`);
        }
      }

      if (centerText) {
        svgParts.push(`
          <text x="${cx}" y="${cy}" text-anchor="middle"
                font-size="${fsCenter}" font-weight="400"
                fill="${textColor}" dominant-baseline="middle">
            ${this._escapeHtml(centerText)}
          </text>
        `);
      }

      // Segment labels
      this._renderSegmentLabels(svgParts, segs, total, c, R, cx, cy, textColor);

      // Gaps between segments
      this._renderSegmentGaps(svgParts, segs, c, R, W, cx, cy);

      svgParts.push(`</svg>`);
      
      return svgParts.join('');
    }

    /**
     * Renders labels on donut segments
     * @param {Array} svgParts - Array to append SVG parts to
     * @param {Array} segs - Processed segments
     * @param {number} total - Total value
     * @param {Object} c - Configuration
     * @param {number} R - Radius
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {string} textColor - Text color
     * @private
     */
    _renderSegmentLabels(svgParts, segs, total, c, R, cx, cy, textColor) {
      const labelMode = c.segment_label_mode || "none";
      if (labelMode === "none" || total <= 0 || !segs.length) return;

      const dec = safeParseNumber(c.segment_label_decimals, 1);
      const minAngle = safeParseNumber(c.segment_label_min_angle, 12);
      const offset = safeParseNumber(c.segment_label_offset, 4);
      const segFontScale = safeParseNumber(c.segment_font_scale, 0.18);
      const rLabel = R + offset;

      for (const s of segs) {
        if (s._startAngle === undefined || s._endAngle === undefined) continue;
        const span = s._endAngle - s._startAngle;
        if (span <= minAngle) continue;

        const mid = s._startAngle + span / 2;
        const rad = toRadians(mid);
        const x = cx + rLabel * Math.cos(rad);
        const y = cy + rLabel * Math.sin(rad);

        const pct = total > 0 ? (s.value / total) * 100 : 0;
        const pctStr = `${pct.toFixed(dec)}%`;
        const valStr = Number.isFinite(s.value) ? s.value.toFixed(dec) : s.rawState;

        let t = "";
        if (labelMode === "percent") {
          t = pctStr;
        } else if (labelMode === "value") {
          t = `${valStr}${s.unit ? " " + s.unit : ""}`;
        } else {
          t = `${valStr}${s.unit ? " " + s.unit : ""} (${pctStr})`;
        }

        svgParts.push(`
          <text x="${x}" y="${y}" text-anchor="middle"
                font-size="${R * segFontScale}" fill="${textColor}"
                dominant-baseline="middle">
            ${this._escapeHtml(t)}
          </text>
        `);
      }
    }

    /**
     * Renders gap lines between segments
     * @param {Array} svgParts - Array to append SVG parts to
     * @param {Array} segs - Processed segments
     * @param {Object} c - Configuration
     * @param {number} R - Radius
     * @param {number} W - Ring width
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @private
     */
    _renderSegmentGaps(svgParts, segs, c, R, W, cx, cy) {
      const gapWidth = safeParseNumber(c.segment_gap_width, 0);
      if (gapWidth <= 0 || segs.length <= 1) return;

      let gapColor = c.segment_gap_color;
      if (!gapColor || gapColor === "auto") {
        gapColor = c.background || "var(--ha-card-background, var(--card-background-color))";
      }

      const rInner = R - W / 2 - 1;
      const rOuter = R + W / 2 + 1;

      for (const s of segs) {
        if (s._endAngle === undefined) continue;
        const angle = s._endAngle;
        const rad = toRadians(angle);
        const x0 = cx + rInner * Math.cos(rad);
        const y0 = cy + rInner * Math.sin(rad);
        const x1 = cx + rOuter * Math.cos(rad);
        const y1 = cy + rOuter * Math.sin(rad);

        svgParts.push(`
          <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"
                stroke="${gapColor}" stroke-width="${gapWidth}"
                stroke-linecap="butt"/>
        `);
      }
    }

    /**
     * Escapes HTML special characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     * @private
     */
    _escapeHtml(text) {
      if (!text) return '';
      const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return String(text).replace(/[&<>"']/g, char => escapeMap[char]);
    }

    /**
     * Generates legend HTML
     * @param {Array} segs - Processed segments
     * @param {number} total - Total value
     * @param {Object} c - Configuration
     * @returns {string} Legend HTML string
     * @private
     */
    _renderLegend(segs, total, c) {
      const showLegend = c.show_legend !== false;
      if (!showLegend || total <= 0 || !segs.length) return "";

      const R = safeParseNumber(c.ring_radius, BASE_RADIUS);
      const legendFontScale = safeParseNumber(c.legend_font_scale, 0.22);
      const legendFontSize = R * legendFontScale;
      const legendGap = Math.max(2, R * 0.04);
      const legendMode = c.legend_value_mode || "both";
      const valDec = safeParseNumber(c.center_decimals, 1);
      const pctDec = safeParseNumber(c.legend_percent_decimals, 1);

      let legendHtml = `<div class="legend" style="font-size:${legendFontSize}px; gap:${legendGap}px;">`;

      for (const s of segs) {
        const pct = total > 0 ? (s.value / total) * 100 : 0;
        const pctStr = `${pct.toFixed(pctDec)}%`;
        const valStr = Number.isFinite(s.value) ? s.value.toFixed(valDec) : s.rawState;
        let rightText = "";

        if (legendMode === "value") {
          rightText = `${valStr}${s.unit ? " " + s.unit : ""}`;
        } else if (legendMode === "percent") {
          rightText = pctStr;
        } else {
          rightText = `${valStr}${s.unit ? " " + s.unit : ""} (${pctStr})`;
        }

        const unavailableClass = s.isUnavailable ? ' unavailable' : '';
        legendHtml += `
          <div class="legend-item${unavailableClass}">
            <span class="legend-color" style="background:${s.color};"></span>
            <span class="legend-label">${this._escapeHtml(s.label)}</span>
            <span class="legend-value">${this._escapeHtml(rightText)}</span>
          </div>
        `;
      }

      legendHtml += `</div>`;
      return legendHtml;
    }

    /**
     * Generates component styles with Section Views support
     * @param {Object} c - Configuration
     * @returns {string} CSS style string
     * @private
     */
    _getStyles(c) {
      return `
        <style>
          :host {
            display: block;
            width: 100%;
            contain: content;
          }
          ha-card {
            background: ${c.background};
            border-radius: ${c.border_radius};
            border: ${c.border};
            box-shadow: ${c.box_shadow};
            padding: ${c.padding};
            width: 100%;
            box-sizing: border-box;
            color: var(--primary-text-color);
          }
          .wrap {
            width: 100%;
            max-width: ${c.max_width || "100%"};
            margin: 0 auto;
            box-sizing: border-box;
            padding: 8px 10px 10px 10px;
          }
          .chart-container {
            width: 100%;
          }
          svg {
            width: 100%;
            height: auto;
            display: block;
          }
          text {
            user-select: none;
          }
          .legend {
            width: 100%;
            display: flex;
            flex-direction: column;
          }
          .legend-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }
          .legend-item.unavailable {
            opacity: 0.5;
          }
          .legend-color {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .legend-label {
            flex: 1 1 auto;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .legend-value {
            flex-shrink: 0;
            text-align: right;
            font-variant-numeric: tabular-nums;
          }
          
          /* Loading state styles */
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            color: var(--secondary-text-color);
          }
          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--divider-color);
            border-top-color: var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 8px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          /* Error state styles */
          .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            color: var(--error-color, #db4437);
          }
          .error-icon {
            font-size: 24px;
            margin-bottom: 8px;
          }
          .error-message {
            font-size: 12px;
            text-align: center;
          }
          
          /* Empty state styles */
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            color: var(--secondary-text-color);
          }
          .empty-icon {
            font-size: 32px;
            margin-bottom: 8px;
            opacity: 0.5;
          }
          .empty-message {
            font-size: 14px;
          }
          
          /* Section Views compatibility */
          :host([section-view]) .wrap {
            padding: 0;
          }
          :host([section-view]) ha-card {
            background: transparent;
            border: none;
            box-shadow: none;
          }
          
          /* Container classes for Section Views */
          .section-donut {
            width: 100%;
          }
          .section-legend {
            width: 100%;
          }
          .section-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }
        </style>
      `;
    }

    /**
     * Main render method - generates the complete card HTML
     * @private
     */
    _render() {
      if (!this._config || !this._hass) {
        if (this._isLoading) {
          this.shadowRoot.innerHTML = this._getStyles(DonutChart.getStubConfig()) + 
            `<ha-card><div class="wrap">${this._renderLoadingState()}</div></ha-card>`;
        }
        return;
      }

      const c = this._config;
      const h = this._hass;

      try {
        const segDefs = Array.isArray(c.segments) ? c.segments : [];
        
        if (!segDefs.length) {
          this.shadowRoot.innerHTML = this._getStyles(c) + 
            `<ha-card><div class="wrap">${this._renderEmptyState()}</div></ha-card>`;
          return;
        }

        // Process segments with improved error handling
        const { segs, total, errors } = this._processSegments(segDefs, h.states);
        
        if (errors.length > 0) {
          log('warn', 'Segment processing warnings:', errors);
        }

        // Check minimum total threshold
        const minTotal = safeParseNumber(c.min_total, 0);
        const effectiveTotal = total < minTotal ? 0 : total;

        // Calculate chart gap for legend
        const R = safeParseNumber(c.ring_radius, BASE_RADIUS);
        const chartGap = Math.max(2, R * 0.05);

        // Generate SVG and legend
        const svg = this._renderDonutSvg(segs, effectiveTotal, c);
        const legendHtml = this._renderLegend(segs, effectiveTotal, c);

        // Apply Section Views mode if enabled
        const sectionViewMode = c.section_view_mode === true;
        if (sectionViewMode) {
          this.setAttribute('section-view', '');
        } else {
          this.removeAttribute('section-view');
        }

        // Render complete card
        this.shadowRoot.innerHTML = `
          ${this._getStyles(c)}
          <ha-card>
            <div class="wrap">
              <div class="chart-container${sectionViewMode ? ' section-donut' : ''}" style="margin-bottom:${chartGap}px;">
                ${svg}
              </div>
              <div class="${sectionViewMode ? 'section-legend' : ''}">
                ${legendHtml}
              </div>
            </div>
          </ha-card>
        `;

        this._lastError = null;
      } catch (error) {
        log('error', 'Error rendering chart:', error);
        this._lastError = error.message;
        this.shadowRoot.innerHTML = this._getStyles(c) + 
          `<ha-card><div class="wrap">${this._renderErrorState(error.message)}</div></ha-card>`;
      }
    }

    /**
     * Returns the size of the card for layout purposes
     * @returns {number} Card size units
     */
    getCardSize() {
      return 4;
    }
  }

  // =========================================================================
  // COMPONENT REGISTRATION
  // =========================================================================

  try {
    if (!customElements.get("donut-chart")) {
      customElements.define("donut-chart", DonutChart);
    }

    window.customCards = window.customCards || [];
    window.customCards.push({
      type: "donut-chart",
      name: "Donut Chart",
      description:
        "Multi-segment donut chart with Section Views support, improved error handling, and optimized rendering.",
      preview: true,
      documentationURL: "https://github.com/LodeBo/donut-chart",
    });

    log('info', `v${VERSION} loaded successfully`);
  } catch (e) {
    log('error', 'Failed to register component:', e);
  }
})();
