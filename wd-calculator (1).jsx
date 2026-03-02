import { useState } from "react";

// ─── Product & Box Data ───────────────────────────────────────────────────────

const BOXES = [
  { label: "24x18x18", dims: "61x46x46", units: 250, lbs: 50, kg: 22.7 },
  { label: "18x18x18", dims: "46x46x46", units: 200, lbs: 40, kg: 18 },
  { label: "16x16x16", dims: "41x41x41", units: 150, lbs: 30, kg: 13.6 },
  { label: "14x14x14", dims: "36x36x36", units: 120, lbs: 22, kg: 10 },
  { label: "12x12x12", dims: "30x30x30", units: 50,  lbs: 10, kg: 4.5 },
  { label: "12x10x8",  dims: "30x25x20", units: 30,  lbs: 6,  kg: 2.7 },
  { label: "Medium",   dims: "25x20x15", units: 12,  lbs: 2,  kg: 0.9 },
  { label: "Small",    dims: "20x15x10", units: 8,   lbs: 1,  kg: 0.45 },
];

const PRODUCTS = {
  CRAG: {
    code: "CR2003",
    color: "#e86c2f",
    unitLbs: 0.5,
    flexible: true,
    extraPerBox: 20,
    extraLbsPer10: 1,
    boxes: BOXES,
  },
  HGM: {
    code: "HGM101",
    color: "#2f8fe8",
    unitLbs: 2,
    flexible: false,
    maxPerBox: 24,
    fullBox: { dims: "46x46x46", lbs: 32, kg: 14.5 },
    smallBoxes: [
      { maxUnits: 24, dims: "41x41x41", baseLbs: 4 },
      { maxUnits: 12, dims: "30x30x30", baseLbs: 2 },
      { maxUnits: 6,  dims: "25x20x15", baseLbs: 1 },
    ],
  },
  CAB: {
    code: "CAB102",
    color: "#2fc47a",
    unitLbs: 2,
    flexible: false,
    maxPerBox: 24,
    fullBox: { dims: "46x46x46", lbs: 36, kg: 16.3 },
    smallBoxes: [
      { maxUnits: 24, dims: "41x41x41", baseLbs: 4 },
      { maxUnits: 12, dims: "30x30x30", baseLbs: 2 },
      { maxUnits: 6,  dims: "25x20x15", baseLbs: 1 },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lbsToKg(lbs) { return Math.round(lbs * 0.453592 * 10) / 10; }

function formatBox(dims, netKg, count) {
  const grossKg = Math.ceil(netKg + 0.3);
  return `${dims} @ ${netKg}kg net/${grossKg}kg gross (${count} box${count > 1 ? "es" : ""}, no pallet)`;
}

function calcCRAG(qty) {
  let remaining = qty;
  const groups = {};

  for (const box of BOXES) {
    if (remaining <= 0) break;
    const maxFit = box.units + PRODUCTS.CRAG.extraPerBox + 20; // generous squeeze
    if (remaining >= box.units - 20) {
      const count = Math.floor(remaining / box.units);
      if (count > 0) {
        const leftover = remaining - count * box.units;
        // Can we squeeze leftover into last box?
        if (leftover <= 40) {
          // squeeze all into count boxes, last box gets extras
          groups[box.label] = { count, dims: box.dims, lbs: box.lbs, extras: leftover };
          remaining = 0;
        } else {
          groups[box.label] = { count, dims: box.dims, lbs: box.lbs, extras: 0 };
          remaining -= count * box.units;
        }
      }
    }
  }

  // Build result lines
  const lines = [];
  for (const [, g] of Object.entries(groups)) {
    let lbs = g.lbs;
    if (g.extras > 0) {
      lbs += Math.ceil(g.extras / 10);
    }
    const kg = lbsToKg(lbs);
    lines.push(formatBox(g.dims, kg, g.count));
  }
  return lines;
}

function calcFixed(qty, product) {
  const p = PRODUCTS[product];
  const fullCount = Math.floor(qty / p.maxPerBox);
  const leftover = qty % p.maxPerBox;
  const lines = [];

  if (fullCount > 0) {
    const kg = lbsToKg(p.fullBox.lbs);
    lines.push(formatBox(p.fullBox.dims, kg, fullCount));
  }

  if (leftover > 0) {
    // pick smallest box that fits
    let chosen = p.smallBoxes[0];
    for (const sb of p.smallBoxes) {
      if (leftover <= sb.maxUnits) chosen = sb;
    }
    const lbs = chosen.baseLbs + leftover * p.unitLbs;
    const kg = lbsToKg(lbs);
    lines.push(formatBox(chosen.dims, kg, 1));
  }

  return lines;
}

function calculate(entries) {
  const results = [];
  for (const { product, qty } of entries) {
    if (!qty || qty <= 0) continue;
    let lines;
    if (product === "CRAG") lines = calcCRAG(qty);
    else lines = calcFixed(qty, product);
    results.push({ product, code: PRODUCTS[product].code, color: PRODUCTS[product].color, qty, lines });
  }
  return results;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WDCalculator() {
  const [entries, setEntries] = useState([{ product: "CRAG", qty: "" }]);
  const [results, setResults] = useState([]);
  const [copied, setCopied] = useState(false);

  const addEntry = () => setEntries([...entries, { product: "CRAG", qty: "" }]);
  const removeEntry = (i) => setEntries(entries.filter((_, idx) => idx !== i));
  const updateEntry = (i, field, val) => {
    const next = [...entries];
    next[i] = { ...next[i], [field]: field === "qty" ? (val === "" ? "" : parseInt(val) || "") : val };
    setEntries(next);
  };

  const handleCalc = () => {
    const valid = entries.filter(e => e.qty > 0);
    setResults(calculate(valid));
  };

  const allText = results.flatMap(r =>
    r.lines.map(l => `Estimated W&D: ${l}`)
  ).join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f0f",
      fontFamily: "'Courier New', monospace",
      color: "#f0ede6",
      padding: "40px 20px",
    }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#666", marginBottom: 8 }}>SHIPPING TOOL</div>
          <h1 style={{
            fontSize: 42, fontWeight: 900, margin: 0, lineHeight: 1,
            background: "linear-gradient(135deg, #e8a83a, #e8602f)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>W&D CALCULATOR</h1>
          <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>Weights & Dimensions Estimator</div>
        </div>

        {/* Entries */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {entries.map((e, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, alignItems: "center",
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              borderRadius: 8, padding: "12px 16px",
            }}>
              <select
                value={e.product}
                onChange={ev => updateEntry(i, "product", ev.target.value)}
                style={{
                  background: "#111", border: "1px solid #333", color: "#f0ede6",
                  padding: "8px 12px", borderRadius: 6, fontSize: 13,
                  fontFamily: "'Courier New', monospace", cursor: "pointer", flex: 1,
                }}
              >
                {Object.entries(PRODUCTS).map(([k, v]) => (
                  <option key={k} value={k}>{k} ({v.code})</option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Quantity"
                value={e.qty}
                onChange={ev => updateEntry(i, "qty", ev.target.value)}
                style={{
                  background: "#111", border: "1px solid #333", color: "#f0ede6",
                  padding: "8px 12px", borderRadius: 6, fontSize: 13,
                  fontFamily: "'Courier New', monospace", width: 120,
                  outline: "none",
                }}
              />

              {entries.length > 1 && (
                <button onClick={() => removeEntry(i)} style={{
                  background: "none", border: "1px solid #333", color: "#666",
                  width: 32, height: 32, borderRadius: 6, cursor: "pointer",
                  fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                }}>×</button>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
          <button onClick={addEntry} style={{
            background: "#1a1a1a", border: "1px solid #333", color: "#888",
            padding: "10px 18px", borderRadius: 6, cursor: "pointer",
            fontFamily: "'Courier New', monospace", fontSize: 12, letterSpacing: 1,
          }}>+ ADD PRODUCT</button>

          <button onClick={handleCalc} style={{
            background: "linear-gradient(135deg, #e8a83a, #e8602f)",
            border: "none", color: "#fff", fontWeight: 900,
            padding: "10px 28px", borderRadius: 6, cursor: "pointer",
            fontFamily: "'Courier New', monospace", fontSize: 13, letterSpacing: 2,
            flex: 1,
          }}>CALCULATE</button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#555" }}>RESULTS</div>
              <button onClick={handleCopy} style={{
                background: copied ? "#2a3d2a" : "#1a1a1a",
                border: `1px solid ${copied ? "#2f8f4a" : "#333"}`,
                color: copied ? "#2fc47a" : "#666",
                padding: "6px 14px", borderRadius: 5, cursor: "pointer",
                fontFamily: "'Courier New', monospace", fontSize: 11, letterSpacing: 1,
                transition: "all 0.2s",
              }}>{copied ? "✓ COPIED" : "COPY ALL"}</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {results.map((r, i) => (
                <div key={i} style={{
                  background: "#141414", border: "1px solid #222",
                  borderLeft: `3px solid ${r.color}`,
                  borderRadius: 8, padding: "16px 20px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ color: r.color, fontWeight: 700, fontSize: 14 }}>{r.product}</span>
                    <span style={{ color: "#444", fontSize: 11 }}>{r.code}</span>
                    <span style={{ color: "#444", fontSize: 11, marginLeft: "auto" }}>QTY: {r.qty.toLocaleString()}</span>
                  </div>
                  {r.lines.map((line, j) => (
                    <div key={j} style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: 13, color: "#d4d0c8", lineHeight: 1.8,
                      background: "#0f0f0f", borderRadius: 4,
                      padding: "8px 12px", marginBottom: j < r.lines.length - 1 ? 6 : 0,
                    }}>
                      <span style={{ color: "#555" }}>Estimated W&D: </span>{line}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product ref */}
        <div style={{ marginTop: 48, borderTop: "1px solid #1a1a1a", paddingTop: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#333", marginBottom: 12 }}>PRODUCT REFERENCE</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(PRODUCTS).map(([k, v]) => (
              <div key={k} style={{
                background: "#141414", border: `1px solid #222`,
                borderRadius: 6, padding: "8px 14px", fontSize: 11, color: "#555",
              }}>
                <span style={{ color: v.color }}>{k}</span> · {v.code} · {v.unitLbs}lb/unit
                {v.flexible ? " · flexible packing" : ` · max ${v.maxPerBox}/box`}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
