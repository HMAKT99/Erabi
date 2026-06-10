(() => {
  var e = {};
  ((e.id = 931),
    (e.ids = [931]),
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
      2332: (e, t, s) => {
        "use strict";
        (s.r(t),
          s.d(t, {
            GlobalError: () => l.a,
            __next_app__: () => x,
            originalPathname: () => m,
            pages: () => c,
            routeModule: () => p,
            tree: () => d,
          }),
          s(86),
          s(1595),
          s(8714));
        var r = s(3653),
          n = s(4966),
          a = s(6070),
          l = s.n(a),
          i = s(2555),
          o = {};
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
            ].indexOf(e) && (o[e] = () => i[e]);
        s.d(t, o);
        let d = [
            "",
            {
              children: [
                "__PAGE__",
                {},
                {
                  page: [
                    () => Promise.resolve().then(s.bind(s, 86)),
                    "/Users/arun/erabi/apps/explorer/app/page.tsx",
                  ],
                },
              ],
            },
            {
              layout: [
                () => Promise.resolve().then(s.bind(s, 1595)),
                "/Users/arun/erabi/apps/explorer/app/layout.tsx",
              ],
              "not-found": [
                () => Promise.resolve().then(s.t.bind(s, 8714, 23)),
                "next/dist/client/components/not-found-error",
              ],
            },
          ],
          c = ["/Users/arun/erabi/apps/explorer/app/page.tsx"],
          m = "/page",
          x = { require: s, loadChunk: () => Promise.resolve() },
          p = new r.AppPageRouteModule({
            definition: {
              kind: n.x.APP_PAGE,
              page: "/page",
              pathname: "/",
              bundlePath: "",
              filename: "",
              appPaths: [],
            },
            userland: { loaderTree: d },
          });
      },
      1203: (e, t, s) => {
        Promise.resolve().then(s.t.bind(s, 307, 23));
      },
      8417: (e, t, s) => {
        Promise.resolve().then(s.bind(s, 9255));
      },
      2785: (e, t, s) => {
        (Promise.resolve().then(s.t.bind(s, 417, 23)),
          Promise.resolve().then(s.t.bind(s, 181, 23)),
          Promise.resolve().then(s.t.bind(s, 7814, 23)),
          Promise.resolve().then(s.t.bind(s, 5266, 23)),
          Promise.resolve().then(s.t.bind(s, 490, 23)),
          Promise.resolve().then(s.t.bind(s, 2648, 23)));
      },
      9255: (e, t, s) => {
        "use strict";
        (s.r(t), s.d(t, { default: () => i }));
        var r = s(2064),
          n = s(5032),
          a = s(2856);
        let l = {
          "agent.registered": "text-terminal-green",
          "bid.placed": "text-terminal-amber",
          "intent.received": "text-terminal-text",
          "auction.cleared": "text-terminal-amber",
          "settlement.confirmed": "text-terminal-green",
        };
        function i() {
          let [e, t] = (0, n.useState)(null),
            [s, i] = (0, n.useState)(null),
            [d, c] = (0, n.useState)(null),
            [m, x] = (0, n.useState)([]),
            [p, h] = (0, n.useState)("");
          return (
            (0, n.useRef)(null),
            (0, r.jsxs)("main", {
              className: "space-y-8",
              children: [
                (0, r.jsxs)("section", {
                  className: "grid grid-cols-2 gap-4 md:grid-cols-4",
                  children: [
                    r.jsx(o, { label: "agents", value: e?.agents }),
                    r.jsx(o, { label: "intents", value: s?.intents }),
                    r.jsx(o, { label: "sponsored served", value: s?.sponsored_served }),
                    r.jsx(o, {
                      label: "settled (usd)",
                      value: d ? `$${d.settled_value_usd.toFixed(2)}` : void 0,
                    }),
                  ],
                }),
                (0, r.jsxs)("section", {
                  className: "grid gap-8 md:grid-cols-2",
                  children: [
                    (0, r.jsxs)("div", {
                      className: "panel",
                      children: [
                        r.jsx("h2", { className: "label mb-3", children: "live network feed" }),
                        (0, r.jsxs)("div", {
                          className: "h-80 space-y-1 overflow-y-auto text-xs",
                          children: [
                            0 === m.length &&
                              r.jsx("p", {
                                className: "text-terminal-dim",
                                children:
                                  "waiting for events… fire an intent on this node to see the network move.",
                              }),
                            m.map((e, t) =>
                              (0, r.jsxs)(
                                "div",
                                {
                                  className: "flex gap-2",
                                  children: [
                                    r.jsx("span", {
                                      className: "shrink-0 text-terminal-dim",
                                      children: e.ts.slice(11, 19),
                                    }),
                                    r.jsx("span", {
                                      className: `shrink-0 ${l[e.type] ?? ""}`,
                                      children: e.type,
                                    }),
                                    r.jsx("span", {
                                      className: "truncate text-terminal-dim",
                                      children: JSON.stringify(e.data),
                                    }),
                                  ],
                                },
                                t,
                              ),
                            ),
                          ],
                        }),
                      ],
                    }),
                    (0, r.jsxs)("div", {
                      className: "space-y-8",
                      children: [
                        (0, r.jsxs)("div", {
                          className: "panel",
                          children: [
                            r.jsx("h2", {
                              className: "label mb-3",
                              children: "earnings beacon \xb7 top earners",
                            }),
                            d && 0 !== d.top_earners.length
                              ? r.jsx("table", {
                                  className: "w-full text-xs",
                                  children: r.jsx("tbody", {
                                    children: d.top_earners.map((e) =>
                                      (0, r.jsxs)(
                                        "tr",
                                        {
                                          className: "border-b border-terminal-border",
                                          children: [
                                            r.jsx("td", {
                                              className: "py-1 pr-2",
                                              children: r.jsx("a", {
                                                href: `/agents/${encodeURIComponent(e.agent_id)}`,
                                                className: "hover:text-terminal-green",
                                                children: e.name ?? e.agent_id.slice(0, 24),
                                              }),
                                            }),
                                            (0, r.jsxs)("td", {
                                              className: "py-1 text-right text-terminal-green",
                                              children: ["$", e.earned_usd.toFixed(4)],
                                            }),
                                          ],
                                        },
                                        e.agent_id,
                                      ),
                                    ),
                                  }),
                                })
                              : r.jsx("p", {
                                  className: "text-xs text-terminal-dim",
                                  children:
                                    "no settlements yet — the first confirmed outcome lands here.",
                                }),
                            (0, r.jsxs)("p", {
                              className: "mt-3 text-[10px] text-terminal-dim",
                              children: [
                                "machine-readable: GET ",
                                a.b.attribution,
                                "/v1/stats/earnings",
                              ],
                            }),
                          ],
                        }),
                        (0, r.jsxs)("div", {
                          className: "panel",
                          children: [
                            r.jsx("h2", { className: "label mb-3", children: "agent lookup" }),
                            (0, r.jsxs)("form", {
                              onSubmit: (e) => {
                                (e.preventDefault(),
                                  p.trim() &&
                                    (window.location.href = `/agents/${encodeURIComponent(p.trim())}`));
                              },
                              className: "flex gap-2",
                              children: [
                                r.jsx("input", {
                                  value: p,
                                  onChange: (e) => h(e.target.value),
                                  placeholder: "erabi:agent:…",
                                  className:
                                    "flex-1 rounded border border-terminal-border bg-terminal-bg px-2 py-1 text-xs outline-none focus:border-terminal-green",
                                }),
                                r.jsx("button", {
                                  type: "submit",
                                  className:
                                    "rounded border border-terminal-green px-3 py-1 text-xs text-terminal-green hover:bg-terminal-green hover:text-terminal-bg",
                                  children: "open",
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            })
          );
        }
        function o({ label: e, value: t }) {
          return (0, r.jsxs)("div", {
            className: "panel",
            children: [
              r.jsx("div", { className: "label", children: e }),
              r.jsx("div", { className: "mt-1 text-2xl text-terminal-green", children: t ?? "—" }),
            ],
          });
        }
      },
      2856: (e, t, s) => {
        "use strict";
        s.d(t, { L: () => n, b: () => r });
        let r = {
          registry: process.env.NEXT_PUBLIC_ERABI_REGISTRY_URL ?? "http://localhost:4001",
          exchange: process.env.NEXT_PUBLIC_ERABI_EXCHANGE_URL ?? "http://localhost:4002",
          attribution: process.env.NEXT_PUBLIC_ERABI_ATTRIBUTION_URL ?? "http://localhost:4003",
          reputation: process.env.NEXT_PUBLIC_ERABI_REPUTATION_URL ?? "http://localhost:4004",
        };
        async function n(e) {
          try {
            let t = await fetch(e, { cache: "no-store" });
            if (!t.ok) return null;
            return await t.json();
          } catch {
            return null;
          }
        }
      },
      1595: (e, t, s) => {
        "use strict";
        (s.r(t), s.d(t, { default: () => l, metadata: () => a }));
        var r = s(9222),
          n = s(3023);
        s(6557);
        let a = {
          title: "Erabi Explorer",
          description:
            "Live view of the Erabi intent exchange: agents joining, intents flowing, auctions clearing, settlements confirming.",
        };
        function l({ children: e }) {
          return r.jsx("html", {
            lang: "en",
            children: r.jsx("body", {
              children: (0, r.jsxs)("div", {
                className: "mx-auto max-w-6xl px-4 py-6",
                children: [
                  (0, r.jsxs)("header", {
                    className:
                      "mb-8 flex items-baseline justify-between border-b border-terminal-border pb-4",
                    children: [
                      (0, r.jsxs)(n.default, {
                        href: "/",
                        className: "text-xl font-bold tracking-tight",
                        children: [
                          r.jsx("span", { className: "text-terminal-green", children: "erabi" }),
                          r.jsx("span", {
                            className: "text-terminal-dim",
                            children: "://explorer",
                          }),
                        ],
                      }),
                      (0, r.jsxs)("nav", {
                        className: "flex gap-6 text-sm",
                        children: [
                          r.jsx(n.default, {
                            href: "/",
                            className: "hover:text-terminal-green",
                            children: "ticker",
                          }),
                          r.jsx(n.default, {
                            href: "/disclosures",
                            className: "hover:text-terminal-green",
                            children: "disclosure inspector",
                          }),
                        ],
                      }),
                    ],
                  }),
                  e,
                  r.jsx("footer", {
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
      86: (e, t, s) => {
        "use strict";
        (s.r(t), s.d(t, { default: () => r }));
        let r = (0, s(1924).createProxy)(
          String.raw`/Users/arun/erabi/apps/explorer/app/page.tsx#default`,
        );
      },
      6557: () => {},
    }));
  var t = require("../webpack-runtime.js");
  t.C(e);
  var s = (e) => t((t.s = e)),
    r = t.X(0, [557], () => s(2332));
  module.exports = r;
})();
