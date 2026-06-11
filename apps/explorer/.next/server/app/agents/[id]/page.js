(() => {
  var e = {};
  ((e.id = 996),
    (e.ids = [996]),
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
      2403: (e, s, t) => {
        "use strict";
        (t.r(s),
          t.d(s, {
            GlobalError: () => n.a,
            __next_app__: () => m,
            originalPathname: () => x,
            pages: () => o,
            routeModule: () => h,
            tree: () => c,
          }),
          t(1683),
          t(1595),
          t(8714));
        var a = t(3653),
          r = t(4966),
          l = t(6070),
          n = t.n(l),
          i = t(2555),
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
        t.d(s, d);
        let c = [
            "",
            {
              children: [
                "agents",
                {
                  children: [
                    "[id]",
                    {
                      children: [
                        "__PAGE__",
                        {},
                        {
                          page: [
                            () => Promise.resolve().then(t.bind(t, 1683)),
                            "/Users/arun/erabi/apps/explorer/app/agents/[id]/page.tsx",
                          ],
                        },
                      ],
                    },
                    {},
                  ],
                },
                {},
              ],
            },
            {
              layout: [
                () => Promise.resolve().then(t.bind(t, 1595)),
                "/Users/arun/erabi/apps/explorer/app/layout.tsx",
              ],
              "not-found": [
                () => Promise.resolve().then(t.t.bind(t, 8714, 23)),
                "next/dist/client/components/not-found-error",
              ],
            },
          ],
          o = ["/Users/arun/erabi/apps/explorer/app/agents/[id]/page.tsx"],
          x = "/agents/[id]/page",
          m = { require: t, loadChunk: () => Promise.resolve() },
          h = new a.AppPageRouteModule({
            definition: {
              kind: r.x.APP_PAGE,
              page: "/agents/[id]/page",
              pathname: "/agents/[id]",
              bundlePath: "",
              filename: "",
              appPaths: [],
            },
            userland: { loaderTree: c },
          });
      },
      7733: (e, s, t) => {
        Promise.resolve().then(t.bind(t, 6037));
      },
      1203: (e, s, t) => {
        Promise.resolve().then(t.t.bind(t, 307, 23));
      },
      2785: (e, s, t) => {
        (Promise.resolve().then(t.t.bind(t, 417, 23)),
          Promise.resolve().then(t.t.bind(t, 181, 23)),
          Promise.resolve().then(t.t.bind(t, 7814, 23)),
          Promise.resolve().then(t.t.bind(t, 5266, 23)),
          Promise.resolve().then(t.t.bind(t, 490, 23)),
          Promise.resolve().then(t.t.bind(t, 2648, 23)));
      },
      6037: (e, s, t) => {
        "use strict";
        (t.r(s), t.d(s, { default: () => i }));
        var a = t(2064),
          r = t(5032),
          l = t(246),
          n = t(2856);
        function i() {
          let e = decodeURIComponent((0, l.useParams)().id),
            [s, t] = (0, r.useState)(null),
            [i, o] = (0, r.useState)(null),
            [x, m] = (0, r.useState)(null),
            [h, u] = (0, r.useState)(null),
            [p, b] = (0, r.useState)(!1);
          return p
            ? (0, a.jsxs)("p", {
                className: "text-terminal-red",
                children: ["no agent ", e, " on this node."],
              })
            : s
              ? (0, a.jsxs)("main", {
                  className: "space-y-6",
                  children: [
                    (0, a.jsxs)("section", {
                      className: "panel",
                      children: [
                        (0, a.jsxs)("div", {
                          className: "flex flex-wrap items-baseline justify-between gap-2",
                          children: [
                            a.jsx("h1", {
                              className: "text-lg text-terminal-green",
                              children: s.manifest.name,
                            }),
                            a.jsx("span", {
                              className:
                                "rounded border border-terminal-border px-2 py-0.5 text-xs uppercase",
                              children: s.tier,
                            }),
                          ],
                        }),
                        a.jsx("p", {
                          className: "mt-1 break-all text-xs text-terminal-dim",
                          children: s.manifest.id,
                        }),
                        (0, a.jsxs)("dl", {
                          className: "mt-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-4",
                          children: [
                            a.jsx(d, {
                              label: "capabilities",
                              value: s.manifest.capabilities.join(", "),
                            }),
                            a.jsx(d, { label: "owner", value: s.manifest.owner.type }),
                            a.jsx(d, {
                              label: "payout binding",
                              value: s.manifest.owner.payout_binding ? "bound" : "unbound",
                            }),
                            a.jsx(d, {
                              label: "accepts sponsored",
                              value: String(s.manifest.policy.accepts_sponsored),
                            }),
                            a.jsx(d, { label: "key seq", value: String(s.key_seq) }),
                            a.jsx(d, { label: "joined", value: s.created_at.slice(0, 10) }),
                            a.jsx(d, { label: "referrer", value: s.manifest.referrer ?? "—" }),
                          ],
                        }),
                        a.jsx("img", {
                          src: `${n.b.attribution}/v1/badge/${encodeURIComponent(e)}.svg`,
                          alt: "Erabi badge",
                          className: "mt-4 h-6",
                        }),
                      ],
                    }),
                    (0, a.jsxs)("section", {
                      className: "grid gap-6 md:grid-cols-2",
                      children: [
                        (0, a.jsxs)("div", {
                          className: "panel",
                          children: [
                            a.jsx("h2", {
                              className: "label mb-3",
                              children: "reputation — don't trust the number, verify the events",
                            }),
                            i
                              ? (0, a.jsxs)(a.Fragment, {
                                  children: [
                                    a.jsx("div", {
                                      className: "text-4xl text-terminal-green",
                                      children: i.score,
                                    }),
                                    (0, a.jsxs)("p", {
                                      className: "mt-1 text-xs text-terminal-dim",
                                      children: [
                                        i.confirmed_events,
                                        " confirmed events",
                                        i.cold_capped
                                          ? " \xb7 cold-capped until 10 dual-signed events"
                                          : "",
                                      ],
                                    }),
                                    a.jsx("dl", {
                                      className: "mt-3 space-y-1 text-xs",
                                      children: Object.entries(i.components).map(([e, s]) =>
                                        (0, a.jsxs)(
                                          "div",
                                          {
                                            className: "flex justify-between",
                                            children: [
                                              a.jsx("dt", {
                                                className: "text-terminal-dim",
                                                children: e,
                                              }),
                                              a.jsx("dd", { children: s.toFixed(3) }),
                                            ],
                                          },
                                          e,
                                        ),
                                      ),
                                    }),
                                  ],
                                })
                              : a.jsx("p", {
                                  className: "text-xs text-terminal-dim",
                                  children: "reputation service unreachable",
                                }),
                          ],
                        }),
                        (0, a.jsxs)("div", {
                          className: "panel",
                          children: [
                            a.jsx("h2", { className: "label mb-3", children: "earnings" }),
                            x
                              ? (0, a.jsxs)("dl", {
                                  className: "space-y-1 text-xs",
                                  children: [
                                    a.jsx(c, {
                                      label: "accrued",
                                      value: `$${x.accrued_usd.toFixed(4)}`,
                                    }),
                                    a.jsx(c, {
                                      label: "referral",
                                      value: `$${x.referral_usd.toFixed(4)}`,
                                    }),
                                    a.jsx(c, {
                                      label: "frozen",
                                      value: `$${x.frozen_usd.toFixed(4)}`,
                                    }),
                                    a.jsx(c, { label: "paid", value: `$${x.paid_usd.toFixed(4)}` }),
                                    a.jsx(c, {
                                      label: "available",
                                      value: `$${x.available_usd.toFixed(4)}`,
                                    }),
                                  ],
                                })
                              : a.jsx("p", {
                                  className: "text-xs text-terminal-dim",
                                  children: "attribution service unreachable",
                                }),
                          ],
                        }),
                      ],
                    }),
                    (0, a.jsxs)("section", {
                      className: "panel",
                      children: [
                        (0, a.jsxs)("h2", {
                          className: "label mb-3",
                          children: [
                            "provider ledger",
                            " ",
                            h &&
                              (h.chain_valid
                                ? a.jsx("span", {
                                    className: "text-terminal-green",
                                    children: "\xb7 chain verified",
                                  })
                                : a.jsx("span", {
                                    className: "text-terminal-red",
                                    children: "\xb7 CHAIN BROKEN",
                                  })),
                          ],
                        }),
                        h && 0 !== h.events.length
                          ? a.jsx("div", {
                              className: "max-h-80 overflow-y-auto",
                              children: (0, a.jsxs)("table", {
                                className: "w-full text-xs",
                                children: [
                                  a.jsx("thead", {
                                    className: "text-left text-terminal-dim",
                                    children: (0, a.jsxs)("tr", {
                                      children: [
                                        a.jsx("th", { className: "py-1", children: "kind" }),
                                        a.jsx("th", { children: "status" }),
                                        a.jsx("th", { className: "text-right", children: "value" }),
                                        a.jsx("th", { children: "hash" }),
                                      ],
                                    }),
                                  }),
                                  a.jsx("tbody", {
                                    children: h.events.map((e) =>
                                      (0, a.jsxs)(
                                        "tr",
                                        {
                                          className: "border-t border-terminal-border",
                                          children: [
                                            a.jsx("td", { className: "py-1", children: e.kind }),
                                            a.jsx("td", {
                                              className:
                                                "confirmed" === e.status
                                                  ? "text-terminal-green"
                                                  : "under_review" === e.status ||
                                                      "disputed" === e.status
                                                    ? "text-terminal-red"
                                                    : "text-terminal-amber",
                                              children: e.status,
                                            }),
                                            (0, a.jsxs)("td", {
                                              className: "text-right",
                                              children: ["$", e.value_usd.toFixed(2)],
                                            }),
                                            (0, a.jsxs)("td", {
                                              className: "truncate text-terminal-dim",
                                              children: [e.hash.slice(0, 26), "…"],
                                            }),
                                          ],
                                        },
                                        e.event_id,
                                      ),
                                    ),
                                  }),
                                ],
                              }),
                            })
                          : a.jsx("p", {
                              className: "text-xs text-terminal-dim",
                              children: "no ledger entries as provider.",
                            }),
                      ],
                    }),
                  ],
                })
              : (0, a.jsxs)("p", {
                  className: "text-terminal-dim",
                  children: ["loading ", e, "…"],
                });
        }
        function d({ label: e, value: s }) {
          return (0, a.jsxs)("div", {
            children: [
              a.jsx("dt", { className: "label", children: e }),
              a.jsx("dd", { className: "mt-0.5 break-all", children: s }),
            ],
          });
        }
        function c({ label: e, value: s }) {
          return (0, a.jsxs)("div", {
            className: "flex justify-between",
            children: [
              a.jsx("dt", { className: "text-terminal-dim", children: e }),
              a.jsx("dd", { children: s }),
            ],
          });
        }
      },
      2856: (e, s, t) => {
        "use strict";
        t.d(s, { L: () => r, b: () => a });
        let a = {
          registry: process.env.NEXT_PUBLIC_ERABI_REGISTRY_URL ?? "http://localhost:4001",
          exchange: process.env.NEXT_PUBLIC_ERABI_EXCHANGE_URL ?? "http://localhost:4002",
          attribution: process.env.NEXT_PUBLIC_ERABI_ATTRIBUTION_URL ?? "http://localhost:4003",
          reputation: process.env.NEXT_PUBLIC_ERABI_REPUTATION_URL ?? "http://localhost:4004",
        };
        async function r(e) {
          try {
            let s = await fetch(e, { cache: "no-store" });
            if (!s.ok) return null;
            return await s.json();
          } catch {
            return null;
          }
        }
      },
      1683: (e, s, t) => {
        "use strict";
        (t.r(s), t.d(s, { default: () => a }));
        let a = (0, t(1924).createProxy)(
          String.raw`/Users/arun/erabi/apps/explorer/app/agents/[id]/page.tsx#default`,
        );
      },
      1595: (e, s, t) => {
        "use strict";
        (t.r(s), t.d(s, { default: () => n, metadata: () => l }));
        var a = t(9222),
          r = t(3023);
        t(6557);
        let l = {
          title: "Erabi Explorer",
          description:
            "Live view of the Erabi intent exchange: agents joining, intents flowing, auctions clearing, settlements confirming.",
        };
        function n({ children: e }) {
          return a.jsx("html", {
            lang: "en",
            children: a.jsx("body", {
              children: (0, a.jsxs)("div", {
                className: "mx-auto max-w-6xl px-4 py-6",
                children: [
                  (0, a.jsxs)("header", {
                    className:
                      "mb-8 flex items-baseline justify-between border-b border-terminal-border pb-4",
                    children: [
                      (0, a.jsxs)(r.default, {
                        href: "/",
                        className: "text-xl font-bold tracking-tight",
                        children: [
                          a.jsx("span", { className: "text-terminal-green", children: "erabi" }),
                          a.jsx("span", {
                            className: "text-terminal-dim",
                            children: "://explorer",
                          }),
                        ],
                      }),
                      (0, a.jsxs)("nav", {
                        className: "flex gap-5 text-sm",
                        children: [
                          a.jsx(r.default, {
                            href: "/",
                            className: "hover:text-terminal-green",
                            children: "ticker",
                          }),
                          a.jsx(r.default, {
                            href: "/agents",
                            className: "hover:text-terminal-green",
                            children: "agents",
                          }),
                          a.jsx(r.default, {
                            href: "/leaderboard",
                            className: "hover:text-terminal-green",
                            children: "leaderboard",
                          }),
                          a.jsx(r.default, {
                            href: "/disclosures",
                            className: "hover:text-terminal-green",
                            children: "disclosures",
                          }),
                          a.jsx(r.default, {
                            href: "/dashboard",
                            className: "hover:text-terminal-green",
                            children: "dashboard",
                          }),
                        ],
                      }),
                    ],
                  }),
                  e,
                  a.jsx("footer", {
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
  var s = require("../../../webpack-runtime.js");
  s.C(e);
  var t = (e) => s((s.s = e)),
    a = s.X(0, [557], () => t(2403));
  module.exports = a;
})();
