(() => {
  var e = {};
  ((e.id = 173),
    (e.ids = [173]),
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
      7436: (e, t, r) => {
        "use strict";
        (r.r(t),
          r.d(t, {
            GlobalError: () => l.a,
            __next_app__: () => x,
            originalPathname: () => m,
            pages: () => c,
            routeModule: () => h,
            tree: () => o,
          }),
          r(4701),
          r(5783),
          r(8714));
        var s = r(3653),
          a = r(4966),
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
        r.d(t, d);
        let o = [
            "",
            {
              children: [
                "leaderboard",
                {
                  children: [
                    "__PAGE__",
                    {},
                    {
                      page: [
                        () => Promise.resolve().then(r.bind(r, 4701)),
                        "/Users/arun/erabi/apps/explorer/app/leaderboard/page.tsx",
                      ],
                    },
                  ],
                },
                {},
              ],
            },
            {
              layout: [
                () => Promise.resolve().then(r.bind(r, 5783)),
                "/Users/arun/erabi/apps/explorer/app/layout.tsx",
              ],
              "not-found": [
                () => Promise.resolve().then(r.t.bind(r, 8714, 23)),
                "next/dist/client/components/not-found-error",
              ],
            },
          ],
          c = ["/Users/arun/erabi/apps/explorer/app/leaderboard/page.tsx"],
          m = "/leaderboard/page",
          x = { require: r, loadChunk: () => Promise.resolve() },
          h = new s.AppPageRouteModule({
            definition: {
              kind: a.x.APP_PAGE,
              page: "/leaderboard/page",
              pathname: "/leaderboard",
              bundlePath: "",
              filename: "",
              appPaths: [],
            },
            userland: { loaderTree: o },
          });
      },
      3766: (e, t, r) => {
        (Promise.resolve().then(r.bind(r, 4334)), Promise.resolve().then(r.t.bind(r, 307, 23)));
      },
      9429: (e, t, r) => {
        Promise.resolve().then(r.bind(r, 7685));
      },
      2785: (e, t, r) => {
        (Promise.resolve().then(r.t.bind(r, 417, 23)),
          Promise.resolve().then(r.t.bind(r, 181, 23)),
          Promise.resolve().then(r.t.bind(r, 7814, 23)),
          Promise.resolve().then(r.t.bind(r, 5266, 23)),
          Promise.resolve().then(r.t.bind(r, 490, 23)),
          Promise.resolve().then(r.t.bind(r, 2648, 23)));
      },
      7685: (e, t, r) => {
        "use strict";
        (r.r(t), r.d(t, { default: () => l }));
        var s = r(2064),
          a = r(5032),
          n = r(2856);
        function l() {
          let [e, t] = (0, a.useState)([]),
            [r, l] = (0, a.useState)([]);
          return (0, s.jsxs)("main", {
            className: "grid gap-6 md:grid-cols-2",
            children: [
              (0, s.jsxs)("section", {
                className: "panel",
                children: [
                  s.jsx("h1", {
                    className: "label mb-3",
                    children: "top earners — confirmed, dual-signed, public",
                  }),
                  0 === e.length
                    ? s.jsx("p", {
                        className: "text-xs text-terminal-dim",
                        children: "no settlements yet.",
                      })
                    : s.jsx("table", {
                        className: "w-full text-xs",
                        children: s.jsx("tbody", {
                          children: e.map((e, t) =>
                            (0, s.jsxs)(
                              "tr",
                              {
                                className: "border-b border-terminal-border",
                                children: [
                                  (0, s.jsxs)("td", {
                                    className: "py-1.5 pr-2 text-terminal-dim",
                                    children: ["#", t + 1],
                                  }),
                                  s.jsx("td", {
                                    className: "py-1.5",
                                    children: s.jsx("a", {
                                      href: `/agents/${encodeURIComponent(e.agent_id)}`,
                                      className: "hover:text-terminal-green",
                                      children: e.name ?? e.agent_id.slice(0, 28),
                                    }),
                                  }),
                                  (0, s.jsxs)("td", {
                                    className: "py-1.5 text-right text-terminal-green",
                                    children: ["$", e.earned_usd.toFixed(4)],
                                  }),
                                  (0, s.jsxs)("td", {
                                    className: "py-1.5 pl-2 text-right text-terminal-dim",
                                    children: [e.entries, " entr", 1 === e.entries ? "y" : "ies"],
                                  }),
                                ],
                              },
                              e.agent_id,
                            ),
                          ),
                        }),
                      }),
                  (0, s.jsxs)("p", {
                    className: "mt-3 text-[10px] text-terminal-dim",
                    children: ["machine-readable: GET ", n.b.attribution, "/v1/stats/earnings"],
                  }),
                ],
              }),
              (0, s.jsxs)("section", {
                className: "panel",
                children: [
                  s.jsx("h1", {
                    className: "label mb-3",
                    children: "top reputation — verify the evidence, not the number",
                  }),
                  0 === r.length
                    ? s.jsx("p", {
                        className: "text-xs text-terminal-dim",
                        children: "no agents yet.",
                      })
                    : s.jsx("table", {
                        className: "w-full text-xs",
                        children: s.jsx("tbody", {
                          children: r.map((e, t) =>
                            (0, s.jsxs)(
                              "tr",
                              {
                                className: "border-b border-terminal-border",
                                children: [
                                  (0, s.jsxs)("td", {
                                    className: "py-1.5 pr-2 text-terminal-dim",
                                    children: ["#", t + 1],
                                  }),
                                  s.jsx("td", {
                                    className: "py-1.5",
                                    children: s.jsx("a", {
                                      href: `/agents/${encodeURIComponent(e.manifest.id)}`,
                                      className: "hover:text-terminal-green",
                                      children: e.manifest.name,
                                    }),
                                  }),
                                  s.jsx("td", {
                                    className: "py-1.5 text-right text-terminal-green",
                                    children: e.reputation,
                                  }),
                                  s.jsx("td", {
                                    className: "py-1.5 pl-2 text-right uppercase text-terminal-dim",
                                    children: e.tier,
                                  }),
                                ],
                              },
                              e.manifest.id,
                            ),
                          ),
                        }),
                      }),
                ],
              }),
            ],
          });
        }
      },
      4334: (e, t, r) => {
        "use strict";
        r.d(t, { ThemeToggle: () => n });
        var s = r(2064),
          a = r(5032);
        function n() {
          let [e, t] = (0, a.useState)("dark");
          return s.jsx("button", {
            onClick: function () {
              let r = "dark" === e ? "light" : "dark";
              (t(r),
                localStorage.setItem("erabi.theme", r),
                document.documentElement.classList.toggle("light", "light" === r));
            },
            "aria-label": "Toggle color theme",
            title: "Toggle color theme",
            className:
              "rounded border border-terminal-border px-2 py-1 text-xs text-terminal-dim hover:border-terminal-green hover:text-terminal-green",
            children: "dark" === e ? "☀ light" : "☾ dark",
          });
        }
      },
      2856: (e, t, r) => {
        "use strict";
        r.d(t, { L: () => a, b: () => s });
        let s = {
          registry: process.env.NEXT_PUBLIC_ERABI_REGISTRY_URL ?? "http://localhost:4001",
          exchange: process.env.NEXT_PUBLIC_ERABI_EXCHANGE_URL ?? "http://localhost:4002",
          attribution: process.env.NEXT_PUBLIC_ERABI_ATTRIBUTION_URL ?? "http://localhost:4003",
          reputation: process.env.NEXT_PUBLIC_ERABI_REPUTATION_URL ?? "http://localhost:4004",
        };
        async function a(e) {
          try {
            let t = await fetch(e, { cache: "no-store" });
            if (!t.ok) return null;
            return await t.json();
          } catch {
            return null;
          }
        }
      },
      5783: (e, t, r) => {
        "use strict";
        (r.r(t), r.d(t, { default: () => i, metadata: () => l }));
        var s = r(9222),
          a = r(3023);
        let n = (0, r(1924).createProxy)(
          String.raw`/Users/arun/erabi/apps/explorer/components/ThemeToggle.tsx#ThemeToggle`,
        );
        r(6557);
        let l = {
          title: "Erabi Explorer",
          description:
            "Live view of the Erabi intent exchange: agents joining, intents flowing, auctions clearing, settlements confirming.",
        };
        function i({ children: e }) {
          return (0, s.jsxs)("html", {
            lang: "en",
            suppressHydrationWarning: !0,
            children: [
              s.jsx("head", {
                children: s.jsx("script", {
                  dangerouslySetInnerHTML: {
                    __html:
                      'try{if(localStorage.getItem("erabi.theme")==="light")document.documentElement.classList.add("light")}catch(e){}',
                  },
                }),
              }),
              s.jsx("body", {
                children: (0, s.jsxs)("div", {
                  className: "mx-auto max-w-6xl px-4 py-6",
                  children: [
                    (0, s.jsxs)("header", {
                      className:
                        "mb-8 flex items-baseline justify-between border-b border-terminal-border pb-4",
                      children: [
                        (0, s.jsxs)(a.default, {
                          href: "/",
                          className: "text-xl font-bold tracking-tight",
                          children: [
                            s.jsx("span", { className: "text-terminal-green", children: "erabi" }),
                            s.jsx("span", {
                              className: "text-terminal-dim",
                              children: "://explorer",
                            }),
                          ],
                        }),
                        (0, s.jsxs)("div", {
                          className: "flex items-center gap-5 text-sm",
                          children: [
                            (0, s.jsxs)("nav", {
                              className: "flex gap-5",
                              children: [
                                s.jsx(a.default, {
                                  href: "/",
                                  className: "hover:text-terminal-green",
                                  children: "ticker",
                                }),
                                s.jsx(a.default, {
                                  href: "/agents",
                                  className: "hover:text-terminal-green",
                                  children: "agents",
                                }),
                                s.jsx(a.default, {
                                  href: "/leaderboard",
                                  className: "hover:text-terminal-green",
                                  children: "leaderboard",
                                }),
                                s.jsx(a.default, {
                                  href: "/disclosures",
                                  className: "hover:text-terminal-green",
                                  children: "disclosures",
                                }),
                                s.jsx(a.default, {
                                  href: "/dashboard",
                                  className: "hover:text-terminal-green",
                                  children: "dashboard",
                                }),
                              ],
                            }),
                            s.jsx(n, {}),
                          ],
                        }),
                      ],
                    }),
                    e,
                    s.jsx("footer", {
                      className:
                        "mt-12 border-t border-terminal-border pt-4 text-xs text-terminal-dim",
                      children:
                        "every paid influence on this network is signed, labeled, and inspectable \xb7 spec erabi/0.1",
                    }),
                  ],
                }),
              }),
            ],
          });
        }
      },
      4701: (e, t, r) => {
        "use strict";
        (r.r(t), r.d(t, { default: () => s }));
        let s = (0, r(1924).createProxy)(
          String.raw`/Users/arun/erabi/apps/explorer/app/leaderboard/page.tsx#default`,
        );
      },
      6557: () => {},
    }));
  var t = require("../../webpack-runtime.js");
  t.C(e);
  var r = (e) => t((t.s = e)),
    s = t.X(0, [557], () => r(7436));
  module.exports = s;
})();
