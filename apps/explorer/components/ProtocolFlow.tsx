/**
 * Animated how-it-works diagram. Pure inline SVG: themes via the CSS
 * variables, animates via the .flow-line/.flow-pulse keyframes, weighs
 * nothing, and works without JavaScript.
 */
export function ProtocolFlow() {
  const box = "var(--t-panel)";
  const border = "var(--t-border)";
  const text = "var(--t-text)";
  const dim = "var(--t-dim)";
  const green = "var(--t-green)";
  const amber = "var(--t-amber)";

  return (
    <svg
      viewBox="0 0 940 300"
      role="img"
      aria-label="How ERABI works: an agent fires an intent, providers bid in the auction, organic and sponsored results return with signed disclosures, outcomes are dual-signed onto the public ledger, which feeds reputation and earnings."
      className="w-full"
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0 0 L8 4 L0 8 z" fill={dim} />
        </marker>
      </defs>

      {/* 1 · your agent */}
      <g className="flow-pulse">
        <rect
          x="8"
          y="110"
          width="150"
          height="80"
          rx="6"
          fill={box}
          stroke={green}
          strokeWidth="1.5"
        />
        <text x="83" y="143" textAnchor="middle" fontFamily="monospace" fontSize="14" fill={green}>
          your agent
        </text>
        <text x="83" y="165" textAnchor="middle" fontFamily="monospace" fontSize="11" fill={dim}>
          fires an intent
        </text>
      </g>
      <line
        className="flow-line"
        x1="160"
        y1="150"
        x2="218"
        y2="150"
        stroke={dim}
        strokeWidth="1.5"
        markerEnd="url(#arrow)"
      />

      {/* 2 · the auction */}
      <rect
        x="222"
        y="110"
        width="150"
        height="80"
        rx="6"
        fill={box}
        stroke={border}
        strokeWidth="1.5"
      />
      <text x="297" y="143" textAnchor="middle" fontFamily="monospace" fontSize="14" fill={text}>
        the auction
      </text>
      <text x="297" y="165" textAnchor="middle" fontFamily="monospace" fontSize="11" fill={dim}>
        providers bid
      </text>
      <line
        className="flow-line"
        x1="374"
        y1="135"
        x2="432"
        y2="92"
        stroke={dim}
        strokeWidth="1.5"
        markerEnd="url(#arrow)"
      />
      <line
        className="flow-line"
        x1="374"
        y1="165"
        x2="432"
        y2="208"
        stroke={dim}
        strokeWidth="1.5"
        markerEnd="url(#arrow)"
      />

      {/* 3a · organic */}
      <rect
        x="436"
        y="42"
        width="170"
        height="74"
        rx="6"
        fill={box}
        stroke={green}
        strokeWidth="1.5"
      />
      <text x="521" y="72" textAnchor="middle" fontFamily="monospace" fontSize="13" fill={green}>
        organic results
      </text>
      <text x="521" y="93" textAnchor="middle" fontFamily="monospace" fontSize="10.5" fill={dim}>
        ranked by reputation
      </text>

      {/* 3b · sponsored */}
      <rect
        x="436"
        y="184"
        width="170"
        height="74"
        rx="6"
        fill={box}
        stroke={amber}
        strokeWidth="1.5"
      />
      <text x="521" y="212" textAnchor="middle" fontFamily="monospace" fontSize="13" fill={amber}>
        [sponsored]
      </text>
      <text x="521" y="233" textAnchor="middle" fontFamily="monospace" fontSize="10.5" fill={dim}>
        + signed disclosure
      </text>

      <line
        className="flow-line"
        x1="608"
        y1="92"
        x2="666"
        y2="135"
        stroke={dim}
        strokeWidth="1.5"
        markerEnd="url(#arrow)"
      />
      <line
        className="flow-line"
        x1="608"
        y1="208"
        x2="666"
        y2="165"
        stroke={dim}
        strokeWidth="1.5"
        markerEnd="url(#arrow)"
      />

      {/* 4 · outcome */}
      <rect
        x="670"
        y="110"
        width="120"
        height="80"
        rx="6"
        fill={box}
        stroke={border}
        strokeWidth="1.5"
      />
      <text x="730" y="143" textAnchor="middle" fontFamily="monospace" fontSize="14" fill={text}>
        outcome
      </text>
      <text x="730" y="165" textAnchor="middle" fontFamily="monospace" fontSize="11" fill={dim}>
        dual-signed ✓✓
      </text>
      <line
        className="flow-line"
        x1="792"
        y1="150"
        x2="846"
        y2="150"
        stroke={dim}
        strokeWidth="1.5"
        markerEnd="url(#arrow)"
      />

      {/* 5 · ledger */}
      <rect
        x="850"
        y="86"
        width="84"
        height="128"
        rx="6"
        fill={box}
        stroke={green}
        strokeWidth="1.5"
      />
      <text x="892" y="122" textAnchor="middle" fontFamily="monospace" fontSize="12.5" fill={green}>
        ledger
      </text>
      <text x="892" y="146" textAnchor="middle" fontFamily="monospace" fontSize="10.5" fill={dim}>
        reputation
      </text>
      <text x="892" y="163" textAnchor="middle" fontFamily="monospace" fontSize="10.5" fill={dim}>
        + earnings
      </text>
      <text x="892" y="190" textAnchor="middle" fontFamily="monospace" fontSize="10.5" fill={dim}>
        public ∞
      </text>
    </svg>
  );
}
