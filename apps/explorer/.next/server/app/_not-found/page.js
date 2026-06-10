(() => {
  var e = {};
  ((e.id = 409),
    (e.ids = [409]),
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
      8306: (e, t, r) => {
        "use strict";
        (r.r(t),
          r.d(t, {
            GlobalError: () => a.a,
            __next_app__: () => f,
            originalPathname: () => c,
            pages: () => u,
            routeModule: () => p,
            tree: () => d,
          }),
          r(9047),
          r(8714),
          r(1595));
        var n = r(3653),
          s = r(4966),
          o = r(6070),
          a = r.n(o),
          i = r(2555),
          l = {};
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
            ].indexOf(e) && (l[e] = () => i[e]);
        r.d(t, l);
        let d = [
            "",
            {
              children: [
                "/_not-found",
                {
                  children: [
                    "__PAGE__",
                    {},
                    {
                      page: [
                        () => Promise.resolve().then(r.t.bind(r, 8714, 23)),
                        "next/dist/client/components/not-found-error",
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
          u = [],
          c = "/_not-found/page",
          f = { require: r, loadChunk: () => Promise.resolve() },
          p = new n.AppPageRouteModule({
            definition: {
              kind: s.x.APP_PAGE,
              page: "/_not-found/page",
              pathname: "/_not-found",
              bundlePath: "",
              filename: "",
              appPaths: [],
            },
            userland: { loaderTree: d },
          });
      },
      1203: (e, t, r) => {
        Promise.resolve().then(r.t.bind(r, 307, 23));
      },
      2785: (e, t, r) => {
        (Promise.resolve().then(r.t.bind(r, 417, 23)),
          Promise.resolve().then(r.t.bind(r, 181, 23)),
          Promise.resolve().then(r.t.bind(r, 7814, 23)),
          Promise.resolve().then(r.t.bind(r, 5266, 23)),
          Promise.resolve().then(r.t.bind(r, 490, 23)),
          Promise.resolve().then(r.t.bind(r, 2648, 23)));
      },
      1595: (e, t, r) => {
        "use strict";
        (r.r(t), r.d(t, { default: () => a, metadata: () => o }));
        var n = r(9222),
          s = r(3023);
        r(6557);
        let o = {
          title: "Erabi Explorer",
          description:
            "Live view of the Erabi intent exchange: agents joining, intents flowing, auctions clearing, settlements confirming.",
        };
        function a({ children: e }) {
          return n.jsx("html", {
            lang: "en",
            children: n.jsx("body", {
              children: (0, n.jsxs)("div", {
                className: "mx-auto max-w-6xl px-4 py-6",
                children: [
                  (0, n.jsxs)("header", {
                    className:
                      "mb-8 flex items-baseline justify-between border-b border-terminal-border pb-4",
                    children: [
                      (0, n.jsxs)(s.default, {
                        href: "/",
                        className: "text-xl font-bold tracking-tight",
                        children: [
                          n.jsx("span", { className: "text-terminal-green", children: "erabi" }),
                          n.jsx("span", {
                            className: "text-terminal-dim",
                            children: "://explorer",
                          }),
                        ],
                      }),
                      (0, n.jsxs)("nav", {
                        className: "flex gap-5 text-sm",
                        children: [
                          n.jsx(s.default, {
                            href: "/",
                            className: "hover:text-terminal-green",
                            children: "ticker",
                          }),
                          n.jsx(s.default, {
                            href: "/agents",
                            className: "hover:text-terminal-green",
                            children: "agents",
                          }),
                          n.jsx(s.default, {
                            href: "/leaderboard",
                            className: "hover:text-terminal-green",
                            children: "leaderboard",
                          }),
                          n.jsx(s.default, {
                            href: "/disclosures",
                            className: "hover:text-terminal-green",
                            children: "disclosures",
                          }),
                          n.jsx(s.default, {
                            href: "/dashboard",
                            className: "hover:text-terminal-green",
                            children: "dashboard",
                          }),
                        ],
                      }),
                    ],
                  }),
                  e,
                  n.jsx("footer", {
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
      2516: (e, t) => {
        "use strict";
        (Object.defineProperty(t, "__esModule", { value: !0 }),
          (function (e, t) {
            for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
          })(t, {
            isNotFoundError: function () {
              return s;
            },
            notFound: function () {
              return n;
            },
          }));
        let r = "NEXT_NOT_FOUND";
        function n() {
          let e = Error(r);
          throw ((e.digest = r), e);
        }
        function s(e) {
          return "object" == typeof e && null !== e && "digest" in e && e.digest === r;
        }
        ("function" == typeof t.default || ("object" == typeof t.default && null !== t.default)) &&
          void 0 === t.default.__esModule &&
          (Object.defineProperty(t.default, "__esModule", { value: !0 }),
          Object.assign(t.default, t),
          (e.exports = t.default));
      },
      9047: (e, t, r) => {
        "use strict";
        (Object.defineProperty(t, "__esModule", { value: !0 }),
          (function (e, t) {
            for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
          })(t, {
            PARALLEL_ROUTE_DEFAULT_PATH: function () {
              return s;
            },
            default: function () {
              return o;
            },
          }));
        let n = r(2516),
          s = "next/dist/client/components/parallel-route-default.js";
        function o() {
          (0, n.notFound)();
        }
        ("function" == typeof t.default || ("object" == typeof t.default && null !== t.default)) &&
          void 0 === t.default.__esModule &&
          (Object.defineProperty(t.default, "__esModule", { value: !0 }),
          Object.assign(t.default, t),
          (e.exports = t.default));
      },
      6557: () => {},
    }));
  var t = require("../../webpack-runtime.js");
  t.C(e);
  var r = (e) => t((t.s = e)),
    n = t.X(0, [557], () => r(8306));
  module.exports = n;
})();
