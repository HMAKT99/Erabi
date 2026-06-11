(() => {
  var e = {};
  ((e.id = 702),
    (e.ids = [702]),
    (e.modules = {
      2934: (e) => {
        "use strict";
        e.exports = require("next/dist/client/components/action-async-storage.external.js");
      },
      4580: (e) => {
        "use strict";
        e.exports = require("next/dist/client/components/request-async-storage.external.js");
      },
      5869: (e) => {
        "use strict";
        e.exports = require("next/dist/client/components/static-generation-async-storage.external.js");
      },
      399: (e) => {
        "use strict";
        e.exports = require("next/dist/compiled/next-server/app-page.runtime.prod.js");
      },
      6421: (e, a, r) => {
        "use strict";
        (r.r(a),
          r.d(a, {
            GlobalError: () => l.a,
            __next_app__: () => x,
            originalPathname: () => u,
            pages: () => c,
            routeModule: () => p,
            tree: () => o,
          }),
          r(7283),
          r(1595),
          r(8714));
        var t = r(3653),
          s = r(4966),
          n = r(6070),
          l = r.n(n),
          i = r(2555),
          d = {};
        for (let e in i)
          0 >
            [
              "default",
              "tree",
              "pages",
              "GlobalError",
              "originalPathname",
              "__next_app__",
              "routeModule",
            ].indexOf(e) && (d[e] = () => i[e]);
        r.d(a, d);
        let o = [
            "",
            {
              children: [
                "dashboard",
                {
                  children: [
                    "__PAGE__",
                    {},
                    {
                      page: [
                        () => Promise.resolve().then(r.bind(r, 7283)),
                        "/Users/arun/erabi/apps/explorer/app/dashboard/page.tsx",
                      ],
                    },
                  ],
                },
                {},
              ],
            },
            {
              layout: [
                () => Promise.resolve().then(r.bind(r, 1595)),
                "/Users/arun/erabi/apps/explorer/app/layout.tsx",
              ],
              "not-found": [
                () => Promise.resolve().then(r.t.bind(r, 8714, 23)),
                "next/dist/client/components/not-found-error",
              ],
            },
          ],
          c = ["/Users/arun/erabi/apps/explorer/app/dashboard/page.tsx"],
          u = "/dashboard/page",
          x = { require: r, loadChunk: () => Promise.resolve() },
          p = new t.AppPageRouteModule({
            definition: {
              kind: s.x.APP_PAGE,
              page: "/dashboard/page",
              pathname: "/dashboard",
              bundlePath: "",
              filename: "",
              appPaths: [],
            },
            userland: { loaderTree: o },
          });
      },
      673: (e, a, r) => {
        Promise.resolve().then(r.bind(r, 1541));
      },
      1203: (e, a, r) => {
        Promise.resolve().then(r.t.bind(r, 307, 23));
      },
      2785: (e, a, r) => {
        (Promise.resolve().then(r.t.bind(r, 417, 23)),
          Promise.resolve().then(r.t.bind(r, 181, 23)),
          Promise.resolve().then(r.t.bind(r, 7814, 23)),
          Promise.resolve().then(r.t.bind(r, 5266, 23)),
          Promise.resolve().then(r.t.bind(r, 490, 23)),
          Promise.resolve().then(r.t.bind(r, 2648, 23)));
      },
      1541: (e, a, r) => {
        "use strict";
        (r.r(a), r.d(a, { default: () => n }));
        var t = r(2064),
          s = r(5032);
        function n() {
          let [e, a] = (0, s.useState)([]),
            [r, n] = (0, s.useState)(""),
            [d, o] = (0, s.useState)([]),
            [c, u] = (0, s.useState)(!1),
            x = d.reduce(
              (e, a) => ({
                accrued: e.accrued + (a.earnings?.accrued_usd ?? 0),
                available: e.available + (a.earnings?.available_usd ?? 0),
                paid: e.paid + (a.earnings?.paid_usd ?? 0),
              }),
              { accrued: 0, available: 0, paid: 0 },
            );
          return (0, t.jsxs)("main", {
            className: "space-y-6",
            children: [
              (0, t.jsxs)("section", {
                className: "panel",
                children: [
                  t.jsx("h1", { className: "label mb-2", children: "owner dashboard" }),
                  t.jsx("p", {
                    className: "mb-4 text-xs text-terminal-dim",
                    children:
                      "add your agents' ids to watch earnings, reputation, and disputes in one place. stored only in this browser.",
                  }),
                  (0, t.jsxs)("form", {
                    onSubmit: (t) => {
                      t.preventDefault();
                      let s = r.trim();
                      (s && !e.includes(s) && a([...e, s]), n(""));
                    },
                    className: "flex gap-2",
                    children: [
                      t.jsx("input", {
                        value: r,
                        onChange: (e) => n(e.target.value),
                        placeholder: "erabi:agent:…",
                        className:
                          "flex-1 rounded border border-terminal-border bg-terminal-bg px-2 py-1 text-xs outline-none focus:border-terminal-green",
                      }),
                      t.jsx("button", {
                        type: "submit",
                        className:
                          "rounded border border-terminal-green px-3 py-1 text-xs text-terminal-green hover:bg-terminal-green hover:text-terminal-bg",
                        children: "add",
                      }),
                    ],
                  }),
                ],
              }),
              d.length > 0 &&
                (0, t.jsxs)("section", {
                  className: "grid grid-cols-3 gap-4",
                  children: [
                    t.jsx(l, { label: "accrued", value: `$${x.accrued.toFixed(4)}` }),
                    t.jsx(l, { label: "available", value: `$${x.available.toFixed(4)}` }),
                    t.jsx(l, { label: "paid out", value: `$${x.paid.toFixed(4)}` }),
                  ],
                }),
              d.map((r) =>
                (0, t.jsxs)(
                  "section",
                  {
                    className: "panel",
                    children: [
                      (0, t.jsxs)("div", {
                        className: "flex flex-wrap items-baseline justify-between gap-2",
                        children: [
                          t.jsx("a", {
                            href: `/agents/${encodeURIComponent(r.id)}`,
                            className: "text-terminal-green hover:underline",
                            children: r.name,
                          }),
                          (0, t.jsxs)("div", {
                            className: "flex items-center gap-3 text-xs",
                            children: [
                              t.jsx("span", {
                                className: "uppercase text-terminal-dim",
                                children: r.tier,
                              }),
                              (0, t.jsxs)("span", { children: ["rep ", r.reputation] }),
                              t.jsx("button", {
                                onClick: () => a(e.filter((e) => e !== r.id)),
                                className: "text-terminal-dim hover:text-terminal-red",
                                children: "remove",
                              }),
                            ],
                          }),
                        ],
                      }),
                      (0, t.jsxs)("dl", {
                        className: "mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-6",
                        children: [
                          t.jsx(i, {
                            label: "accrued",
                            value: `$${(r.earnings?.accrued_usd ?? 0).toFixed(4)}`,
                          }),
                          t.jsx(i, {
                            label: "available",
                            value: `$${(r.earnings?.available_usd ?? 0).toFixed(4)}`,
                          }),
                          t.jsx(i, {
                            label: "paid",
                            value: `$${(r.earnings?.paid_usd ?? 0).toFixed(4)}`,
                          }),
                          t.jsx(i, {
                            label: "payout",
                            value: r.payoutBound ? "bound" : "unbound",
                            warn: !r.payoutBound,
                          }),
                          t.jsx(i, {
                            label: "disputes / frozen",
                            value: `${r.disputes} / ${r.frozenEvents}`,
                            warn: r.disputes + r.frozenEvents > 0,
                          }),
                          t.jsx(i, {
                            label: "ledger",
                            value: !1 === r.chainValid ? "CHAIN BROKEN" : "verified",
                            warn: !1 === r.chainValid,
                          }),
                        ],
                      }),
                      !r.payoutBound &&
                        t.jsx("p", {
                          className: "mt-2 text-[10px] text-terminal-amber",
                          children:
                            "earnings accrue but cannot pay out until a verified owner binds a payout destination.",
                        }),
                    ],
                  },
                  r.id,
                ),
              ),
            ],
          });
        }
        function l({ label: e, value: a }) {
          return (0, t.jsxs)("div", {
            className: "panel text-center",
            children: [
              t.jsx("div", { className: "text-xl text-terminal-green", children: a }),
              t.jsx("div", { className: "label mt-1", children: e }),
            ],
          });
        }
        function i({ label: e, value: a, warn: r }) {
          return (0, t.jsxs)("div", {
            children: [
              t.jsx("dt", { className: "label", children: e }),
              t.jsx("dd", { className: `mt-0.5 ${r ? "text-terminal-amber" : ""}`, children: a }),
            ],
          });
        }
        r(2856);
      },
      2856: (e, a, r) => {
        "use strict";
        r.d(a, { L: () => s, b: () => t });
        let t = {
          registry: process.env.NEXT_PUBLIC_ERABI_REGISTRY_URL ?? "http://localhost:4001",
          exchange: process.env.NEXT_PUBLIC_ERABI_EXCHANGE_URL ?? "http://localhost:4002",
          attribution: process.env.NEXT_PUBLIC_ERABI_ATTRIBUTION_URL ?? "http://localhost:4003",
          reputation: process.env.NEXT_PUBLIC_ERABI_REPUTATION_URL ?? "http://localhost:4004",
        };
        async function s(e) {
          try {
            let a = await fetch(e, { cache: "no-store" });
            if (!a.ok) return null;
            return await a.json();
          } catch {
            return null;
          }
        }
      },
      7283: (e, a, r) => {
        "use strict";
        (r.r(a), r.d(a, { default: () => t }));
        let t = (0, r(1924).createProxy)(
          String.raw`/Users/arun/erabi/apps/explorer/app/dashboard/page.tsx#default`,
        );
      },
      1595: (e, a, r) => {
        "use strict";
        (r.r(a), r.d(a, { default: () => l, metadata: () => n }));
        var t = r(9222),
          s = r(3023);
        r(6557);
        let n = {
          title: "Erabi Explorer",
          description:
            "Live view of the Erabi intent exchange: agents joining, intents flowing, auctions clearing, settlements confirming.",
        };
        function l({ children: e }) {
          return t.jsx("html", {
            lang: "en",
            children: t.jsx("body", {
              children: (0, t.jsxs)("div", {
                className: "mx-auto max-w-6xl px-4 py-6",
                children: [
                  (0, t.jsxs)("header", {
                    className:
                      "mb-8 flex items-baseline justify-between border-b border-terminal-border pb-4",
                    children: [
                      (0, t.jsxs)(s.default, {
                        href: "/",
                        className: "text-xl font-bold tracking-tight",
                        children: [
                          t.jsx("span", { className: "text-terminal-green", children: "erabi" }),
                          t.jsx("span", {
                            className: "text-terminal-dim",
                            children: "://explorer",
                          }),
                        ],
                      }),
                      (0, t.jsxs)("nav", {
                        className: "flex gap-5 text-sm",
                        children: [
                          t.jsx(s.default, {
                            href: "/",
                            className: "hover:text-terminal-green",
                            children: "ticker",
                          }),
                          t.jsx(s.default, {
                            href: "/agents",
                            className: "hover:text-terminal-green",
                            children: "agents",
                          }),
                          t.jsx(s.default, {
                            href: "/leaderboard",
                            className: "hover:text-terminal-green",
                            children: "leaderboard",
                          }),
                          t.jsx(s.default, {
                            href: "/disclosures",
                            className: "hover:text-terminal-green",
                            children: "disclosures",
                          }),
                          t.jsx(s.default, {
                            href: "/dashboard",
                            className: "hover:text-terminal-green",
                            children: "dashboard",
                          }),
                        ],
                      }),
                    ],
                  }),
                  e,
                  t.jsx("footer", {
                    className:
                      "mt-12 border-t border-terminal-border pt-4 text-xs text-terminal-dim",
                    children:
                      "every paid influence on this network is signed, labeled, and inspectable \xb7 spec erabi/0.1",
                  }),
                ],
              }),
            }),
          });
        }
      },
      6557: () => {},
    }));
  var a = require("../../webpack-runtime.js");
  a.C(e);
  var r = (e) => a((a.s = e)),
    t = a.X(0, [557], () => r(6421));
  module.exports = t;
})();
