class DonutChartCard extends HTMLElement {
  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error("Je moet minstens één entity opgeven in 'entities'.");
    }

    this._config = config;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;              /* vul het grid-slot volledig */
        }

        ha-card {
          height: 100%;              /* geen overflow buiten de rijen */
          padding: 16px;
          box-sizing: border-box;
          background: var(--card-background-color, #1e1e1e);
          display: flex;
          flex-direction: column;
        }

        .wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-height: 0;             /* nodig om goed te kunnen schalen */
        }

        .donut-container {
          width: 100%;
          flex: 1;                   /* neemt alle overblijvende hoogte */
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 0;
        }

        svg.donut {
          display: block;
          max-width: 100%;
          max-height: 100%;
        }

        .legend {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.9rem;
          flex-shrink: 0;            /* legenda mag niet geplet worden */
        }

        .legend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          white-space: nowrap;
        }

        .legend-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .legend-label {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .legend-value {
          text-align: right;
          flex-shrink: 0;
        }

        .center-text {
          font-size: 1.2rem;
          fill: var(--primary-text-color, #ffffff);
        }

        .slice-label {
          font-size: 0.7rem;
          fill: var(--primary-text-color, #ffffff);
        }
      </style>
      <ha-card>
        <div class="wrapper">
          <div class="donut-container">
            <svg class="donut" viewBox="0 0 200 200"></svg>
          </div>
          <div class="legend"></div>
        </div>
      </ha-card>
    `;
  }

  set hass(hass) {
    this._hass = hass;
    const config = this._config;

    const defaultColors = [
      "#ff9800", // oranje
      "#4caf50", // groen
      "#03a9f4", // blauw
      "#e91e63", // roze
      "#9c27b0", // paars
      "#ffc107", // amber
    ];

    const entities = config.entities.map((ent, index) => {
      const entityId = typeof ent === "string" ? ent : ent.entity;
      const stateObj = hass.states[entityId];
      const value = stateObj ? parseFloat(stateObj.state) || 0 : 0;
      const name =
        (typeof ent === "object" && ent.name) ||
        (stateObj && (stateObj.attributes.friendly_name || entityId)) ||
        entityId;
      const color =
        (typeof ent === "object" && ent.color) || defaultColors[index % defaultColors.length];

      return { entity_id: entityId, value, name, color };
    });

    const total =
      config.total_entity && hass.states[config.total_entity]
        ? parseFloat(hass.states[config.total_entity].state) || 0
        : entities.reduce((sum, e) => sum + e.value, 0);

    const firstState = hass.states[entities[0].entity_id];
    const unit =
      config.unit ||
      (firstState && firstState.attributes && firstState.attributes.unit_of_measurement) ||
      "";

    this._renderDonut(entities, total, unit);
    this._renderLegend(entities, total, unit);
  }

  _renderDonut(entities, total, unit) {
    const svg = this.shadowRoot.querySelector("svg.donut");
    if (!svg) return;

    // ring_radius bepaalt relatieve grootte binnen de kaart
    const cfgRadius = this._config.ring_radius !== undefined ? this._config.ring_radius : 80;
    const clampedRadius = Math.max(40, Math.min(100, cfgRadius));

    const baseRadius = 70;
    const ringRadius = (baseRadius * clampedRadius) / 100;  // kleiner getal → kleinere donut
    const baseWidth =
      this._config.ring_width !== undefined ? this._config.ring_width : 22;
    const ringWidth = baseWidth;

    const centerX = 100;
    const centerY = 100;
    const circumference = 2 * Math.PI * ringRadius;

    svg.innerHTML = "";

    const ns = "http://www.w3.org/2000/svg";

    const bgCircle = document.createElementNS(ns, "circle");
    bgCircle.setAttribute("cx", centerX);
    bgCircle.setAttribute("cy", centerY);
    bgCircle.setAttribute("r", ringRadius);
    bgCircle.setAttribute("fill", "none");
    bgCircle.setAttribute("stroke", "rgba(255,255,255,0.05)");
    bgCircle.setAttribute("stroke-width", ringWidth);
    svg.appendChild(bgCircle);

    if (total <= 0) {
      const centerText = document.createElementNS(ns, "text");
      centerText.setAttribute("x", centerX);
      centerText.setAttribute("y", centerY);
      centerText.setAttribute("text-anchor", "middle");
      centerText.setAttribute("dominant-baseline", "central");
      centerText.setAttribute("class", "center-text");
      centerText.textContent = `0 ${unit}`;
      svg.appendChild(centerText);
      return;
    }

    let currentLength = 0;
    let currentAngle = -Math.PI / 2;

    entities.forEach((seg) => {
      const fraction = seg.value / total;
      const segLength = fraction * circumference;

      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", centerX);
      circle.setAttribute("cy", centerY);
      circle.setAttribute("r", ringRadius);
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", seg.color);
      circle.setAttribute("stroke-width", ringWidth);
      circle.setAttribute("stroke-dasharray", `${segLength} ${circumference - segLength}`);
      circle.setAttribute("stroke-dashoffset", `${-currentLength}`);
      circle.setAttribute("stroke-linecap", "butt");
      svg.appendChild(circle);

      if (fraction > 0.05) {
        const midAngle = currentAngle + (fraction * 2 * Math.PI) / 2;
        const labelRadius = ringRadius + ringWidth * 0.7;
        const lx = centerX + Math.cos(midAngle) * labelRadius;
        const ly = centerY + Math.sin(midAngle) * labelRadius;

        const text = document.createElementNS(ns, "text");
        text.setAttribute("x", lx);
        text.setAttribute("y", ly);
        text.setAttribute(
          "text-anchor",
          midAngle > Math.PI / 2 || midAngle < -Math.PI / 2 ? "end" : "start"
        );
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("class", "slice-label");
        text.textContent = `${seg.value.toFixed(0)} ${unit}`;
        svg.appendChild(text);
      }

      currentLength += segLength;
      currentAngle += fraction * 2 * Math.PI;
    });

    const centerValue = document.createElementNS(ns, "text");
    centerValue.setAttribute("x", centerX);
    centerValue.setAttribute("y", centerY - 4);
    centerValue.setAttribute("text-anchor", "middle");
    centerValue.setAttribute("dominant-baseline", "central");
    centerValue.setAttribute("class", "center-text");
    centerValue.textContent = `${total.toFixed(2)} ${unit}`;
    svg.appendChild(centerValue);
  }

  _renderLegend(entities, total, unit) {
    const legend = this.shadowRoot.querySelector(".legend");
    if (!legend) return;

    legend.innerHTML = "";

    entities.forEach((seg) => {
      const row = document.createElement("div");
      row.classList.add("legend-row");

      const left = document.createElement("div");
      left.classList.add("legend-left");

      const dot = document.createElement("span");
      dot.classList.add("legend-dot");
      dot.style.backgroundColor = seg.color;

      const label = document.createElement("span");
      label.classList.add("legend-label");
      label.textContent = seg.name;

      left.appendChild(dot);
      left.appendChild(label);

      const value = document.createElement("span");
      value.classList.add("legend-value");
      const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : "0.0";
      value.textContent = `${seg.value.toFixed(2)} ${unit} (${pct}%)`;

      row.appendChild(left);
      row.appendChild(value);

      legend.appendChild(row);
    });
  }

  getCardSize() {
    return 4;
  }
}

customElements.define("donut-chart", DonutChartCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "donut-chart",
  name: "Donut Chart",
  description: "Eenvoudig donut-grafiekje met legenda.",
});