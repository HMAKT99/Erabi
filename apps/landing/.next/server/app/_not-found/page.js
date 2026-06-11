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
      5932: (e, t, n) => {
        "use strict";
        (n.r(t),
          n.d(t, {
            GlobalError: () => s.a,
            __next_app__: () => f,
            originalPathname: () => c,
            pages: () => d,
            routeModule: () => p,
            tree: () => u,
          }),
          n(9047),
          n(8714),
          n(1595));
        var r = n(3653),
          o = n(4966),
          i = n(6070),
          s = n.n(i),
          a = n(2555),
          l = {};
        for (let e in a)
          0 >
            [
              "default",
              "tree",
              "pages",
              "GlobalError",
              "originalPathname",
              "__next_app__",
              "routeModule",
            ].indexOf(e) && (l[e] = () => a[e]);
        n.d(t, l);
        let u = [
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
                "/Users/arun/erabi/apps/landing/app/layout.tsx",
              ],
              "not-found": [
                () => Promise.resolve().then(n.t.bind(n, 8714, 23)),
                "next/dist/client/components/not-found-error",
              ],
            },
          ],
          d = [],
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
            userland: { loaderTree: u },
          });
      },
      3637: () => {},
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
        (n.r(t), n.d(t, { default: () => i, metadata: () => o }));
        var r = n(9222);
        n(6557);
        let o = {
          title: "ERABI — the open intent exchange for AI agents",
          description:
            "The intent auction and reputation layer of the agent economy. Every paid influence signed, labeled, and inspectable.",
        };
        function i({ children: e }) {
          return r.jsx("html", { lang: "en", children: r.jsx("body", { children: e }) });
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
              return i;
            },
          }));
        let r = n(2516),
          o = "next/dist/client/components/parallel-route-default.js";
        function i() {
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
    r = t.X(0, [295], () => n(5932));
  module.exports = r;
})();
