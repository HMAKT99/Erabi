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
      8306: (e, t, n) => {
        "use strict";
        (n.r(t),
          n.d(t, {
            GlobalError: () => i.a,
            __next_app__: () => f,
            originalPathname: () => c,
            pages: () => u,
            routeModule: () => p,
            tree: () => d,
          }),
          n(9047),
          n(8714),
          n(1595));
        var r = n(3653),
          o = n(4966),
          s = n(6070),
          i = n.n(s),
          l = n(2555),
          a = {};
        for (let e in l)
          0 >
            [
              "default",
              "tree",
              "pages",
              "GlobalError",
              "originalPathname",
              "__next_app__",
              "routeModule",
            ].indexOf(e) && (a[e] = () => l[e]);
        n.d(t, a);
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
                        () => Promise.resolve().then(n.t.bind(n, 8714, 23)),
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
                () => Promise.resolve().then(n.bind(n, 1595)),
                "/Users/arun/erabi/apps/explorer/app/layout.tsx",
              ],
              "not-found": [
                () => Promise.resolve().then(n.t.bind(n, 8714, 23)),
                "next/dist/client/components/not-found-error",
              ],
            },
          ],
          u = [],
          c = "/_not-found/page",
          f = { require: n, loadChunk: () => Promise.resolve() },
          p = new r.AppPageRouteModule({
            definition: {
              kind: o.x.APP_PAGE,
              page: "/_not-found/page",
              pathname: "/_not-found",
              bundlePath: "",
              filename: "",
              appPaths: [],
            },
            userland: { loaderTree: d },
          });
      },
      1203: (e, t, n) => {
        Promise.resolve().then(n.t.bind(n, 307, 23));
      },
      2785: (e, t, n) => {
        (Promise.resolve().then(n.t.bind(n, 417, 23)),
          Promise.resolve().then(n.t.bind(n, 181, 23)),
          Promise.resolve().then(n.t.bind(n, 7814, 23)),
          Promise.resolve().then(n.t.bind(n, 5266, 23)),
          Promise.resolve().then(n.t.bind(n, 490, 23)),
          Promise.resolve().then(n.t.bind(n, 2648, 23)));
      },
      1595: (e, t, n) => {
        "use strict";
        (n.r(t), n.d(t, { default: () => i, metadata: () => s }));
        var r = n(9222),
          o = n(3023);
        n(6557);
        let s = {
          title: "Erabi Explorer",
          description:
            "Live view of the Erabi intent exchange: agents joining, intents flowing, auctions clearing, settlements confirming.",
        };
        function i({ children: e }) {
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
                      (0, r.jsxs)(o.default, {
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
                          r.jsx(o.default, {
                            href: "/",
                            className: "hover:text-terminal-green",
                            children: "ticker",
                          }),
                          r.jsx(o.default, {
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
      2516: (e, t) => {
        "use strict";
        (Object.defineProperty(t, "__esModule", { value: !0 }),
          (function (e, t) {
            for (var n in t) Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
          })(t, {
            isNotFoundError: function () {
              return o;
            },
            notFound: function () {
              return r;
            },
          }));
        let n = "NEXT_NOT_FOUND";
        function r() {
          let e = Error(n);
          throw ((e.digest = n), e);
        }
        function o(e) {
          return "object" == typeof e && null !== e && "digest" in e && e.digest === n;
        }
        ("function" == typeof t.default || ("object" == typeof t.default && null !== t.default)) &&
          void 0 === t.default.__esModule &&
          (Object.defineProperty(t.default, "__esModule", { value: !0 }),
          Object.assign(t.default, t),
          (e.exports = t.default));
      },
      9047: (e, t, n) => {
        "use strict";
        (Object.defineProperty(t, "__esModule", { value: !0 }),
          (function (e, t) {
            for (var n in t) Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
          })(t, {
            PARALLEL_ROUTE_DEFAULT_PATH: function () {
              return o;
            },
            default: function () {
              return s;
            },
          }));
        let r = n(2516),
          o = "next/dist/client/components/parallel-route-default.js";
        function s() {
          (0, r.notFound)();
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
  var n = (e) => t((t.s = e)),
    r = t.X(0, [557], () => n(8306));
  module.exports = r;
})();
