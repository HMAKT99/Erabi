(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [931],
  {
    4590: function (e, t, n) {
      Promise.resolve().then(n.bind(n, 6187));
    },
    6187: function (e, t, n) {
      "use strict";
      (n.r(t),
        n.d(t, {
          default: function () {
            return i;
          },
        }));
      var r = n(5853),
        s = n(4254),
        a = n(7800);
      let l = {
        "agent.registered": "text-terminal-green",
        "bid.placed": "text-terminal-amber",
        "intent.received": "text-terminal-text",
        "auction.cleared": "text-terminal-amber",
        "settlement.confirmed": "text-terminal-green",
      };
      function i() {
        let [e, t] = (0, s.useState)(null),
          [n, i] = (0, s.useState)(null),
          [c, u] = (0, s.useState)(null),
          [d, m] = (0, s.useState)([]),
          [h, f] = (0, s.useState)(""),
          x = (0, s.useRef)(null);
        return (
          (0, s.useEffect)(() => {
            let e = !0;
            async function n() {
              let [n, r, s] = await Promise.all([
                (0, a.L)("".concat(a.b.registry, "/v1/stats")),
                (0, a.L)("".concat(a.b.exchange, "/v1/stats")),
                (0, a.L)("".concat(a.b.attribution, "/v1/stats/earnings")),
              ]);
              e && (t(n), i(r), u(s));
            }
            n();
            let r = setInterval(n, 3e3);
            return () => {
              ((e = !1), clearInterval(r));
            };
          }, []),
          (0, s.useEffect)(() => {
            let e = new EventSource("".concat(a.b.exchange, "/v1/events/stream"));
            for (let t of ((x.current = e), Object.keys(l)))
              e.addEventListener(t, (e) => {
                let t = JSON.parse(e.data);
                m((e) => [t, ...e].slice(0, 50));
              });
            return () => e.close();
          }, []),
          (0, r.jsxs)("main", {
            className: "space-y-8",
            children: [
              (0, r.jsxs)("section", {
                className: "grid grid-cols-2 gap-4 md:grid-cols-4",
                children: [
                  (0, r.jsx)(o, { label: "agents", value: null == e ? void 0 : e.agents }),
                  (0, r.jsx)(o, { label: "intents", value: null == n ? void 0 : n.intents }),
                  (0, r.jsx)(o, {
                    label: "sponsored served",
                    value: null == n ? void 0 : n.sponsored_served,
                  }),
                  (0, r.jsx)(o, {
                    label: "settled (usd)",
                    value: c ? "$".concat(c.settled_value_usd.toFixed(2)) : void 0,
                  }),
                ],
              }),
              (0, r.jsxs)("section", {
                className: "grid gap-8 md:grid-cols-2",
                children: [
                  (0, r.jsxs)("div", {
                    className: "panel",
                    children: [
                      (0, r.jsx)("h2", { className: "label mb-3", children: "live network feed" }),
                      (0, r.jsxs)("div", {
                        className: "h-80 space-y-1 overflow-y-auto text-xs",
                        children: [
                          0 === d.length &&
                            (0, r.jsx)("p", {
                              className: "text-terminal-dim",
                              children:
                                "waiting for events… fire an intent on this node to see the network move.",
                            }),
                          d.map((e, t) => {
                            var n;
                            return (0, r.jsxs)(
                              "div",
                              {
                                className: "flex gap-2",
                                children: [
                                  (0, r.jsx)("span", {
                                    className: "shrink-0 text-terminal-dim",
                                    children: e.ts.slice(11, 19),
                                  }),
                                  (0, r.jsx)("span", {
                                    className: "shrink-0 ".concat(
                                      null !== (n = l[e.type]) && void 0 !== n ? n : "",
                                    ),
                                    children: e.type,
                                  }),
                                  (0, r.jsx)("span", {
                                    className: "truncate text-terminal-dim",
                                    children: JSON.stringify(e.data),
                                  }),
                                ],
                              },
                              t,
                            );
                          }),
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
                          (0, r.jsx)("h2", {
                            className: "label mb-3",
                            children: "earnings beacon \xb7 top earners",
                          }),
                          c && 0 !== c.top_earners.length
                            ? (0, r.jsx)("table", {
                                className: "w-full text-xs",
                                children: (0, r.jsx)("tbody", {
                                  children: c.top_earners.map((e) => {
                                    var t;
                                    return (0, r.jsxs)(
                                      "tr",
                                      {
                                        className: "border-b border-terminal-border",
                                        children: [
                                          (0, r.jsx)("td", {
                                            className: "py-1 pr-2",
                                            children: (0, r.jsx)("a", {
                                              href: "/agents/".concat(
                                                encodeURIComponent(e.agent_id),
                                              ),
                                              className: "hover:text-terminal-green",
                                              children:
                                                null !== (t = e.name) && void 0 !== t
                                                  ? t
                                                  : e.agent_id.slice(0, 24),
                                            }),
                                          }),
                                          (0, r.jsxs)("td", {
                                            className: "py-1 text-right text-terminal-green",
                                            children: ["$", e.earned_usd.toFixed(4)],
                                          }),
                                        ],
                                      },
                                      e.agent_id,
                                    );
                                  }),
                                }),
                              })
                            : (0, r.jsx)("p", {
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
                          (0, r.jsx)("h2", { className: "label mb-3", children: "agent lookup" }),
                          (0, r.jsxs)("form", {
                            onSubmit: (e) => {
                              (e.preventDefault(),
                                h.trim() &&
                                  (window.location.href = "/agents/".concat(
                                    encodeURIComponent(h.trim()),
                                  )));
                            },
                            className: "flex gap-2",
                            children: [
                              (0, r.jsx)("input", {
                                value: h,
                                onChange: (e) => f(e.target.value),
                                placeholder: "erabi:agent:…",
                                className:
                                  "flex-1 rounded border border-terminal-border bg-terminal-bg px-2 py-1 text-xs outline-none focus:border-terminal-green",
                              }),
                              (0, r.jsx)("button", {
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
      function o(e) {
        let { label: t, value: n } = e;
        return (0, r.jsxs)("div", {
          className: "panel",
          children: [
            (0, r.jsx)("div", { className: "label", children: t }),
            (0, r.jsx)("div", {
              className: "mt-1 text-2xl text-terminal-green",
              children: null != n ? n : "—",
            }),
          ],
        });
      }
    },
    7800: function (e, t, n) {
      "use strict";
      n.d(t, {
        L: function () {
          return c;
        },
        b: function () {
          return o;
        },
      });
      var r,
        s,
        a,
        l,
        i = n(3206);
      let o = {
        registry:
          null !== (r = i.env.NEXT_PUBLIC_ERABI_REGISTRY_URL) && void 0 !== r
            ? r
            : "http://localhost:4001",
        exchange:
          null !== (s = i.env.NEXT_PUBLIC_ERABI_EXCHANGE_URL) && void 0 !== s
            ? s
            : "http://localhost:4002",
        attribution:
          null !== (a = i.env.NEXT_PUBLIC_ERABI_ATTRIBUTION_URL) && void 0 !== a
            ? a
            : "http://localhost:4003",
        reputation:
          null !== (l = i.env.NEXT_PUBLIC_ERABI_REPUTATION_URL) && void 0 !== l
            ? l
            : "http://localhost:4004",
      };
      async function c(e) {
        try {
          let t = await fetch(e, { cache: "no-store" });
          if (!t.ok) return null;
          return await t.json();
        } catch (e) {
          return null;
        }
      }
    },
    3206: function (e, t, n) {
      "use strict";
      var r, s;
      e.exports =
        (null == (r = n.g.process) ? void 0 : r.env) &&
        "object" == typeof (null == (s = n.g.process) ? void 0 : s.env)
          ? n.g.process
          : n(8041);
    },
    8041: function (e) {
      !(function () {
        var t = {
            229: function (e) {
              var t,
                n,
                r,
                s = (e.exports = {});
              function a() {
                throw Error("setTimeout has not been defined");
              }
              function l() {
                throw Error("clearTimeout has not been defined");
              }
              function i(e) {
                if (t === setTimeout) return setTimeout(e, 0);
                if ((t === a || !t) && setTimeout) return ((t = setTimeout), setTimeout(e, 0));
                try {
                  return t(e, 0);
                } catch (n) {
                  try {
                    return t.call(null, e, 0);
                  } catch (n) {
                    return t.call(this, e, 0);
                  }
                }
              }
              !(function () {
                try {
                  t = "function" == typeof setTimeout ? setTimeout : a;
                } catch (e) {
                  t = a;
                }
                try {
                  n = "function" == typeof clearTimeout ? clearTimeout : l;
                } catch (e) {
                  n = l;
                }
              })();
              var o = [],
                c = !1,
                u = -1;
              function d() {
                c && r && ((c = !1), r.length ? (o = r.concat(o)) : (u = -1), o.length && m());
              }
              function m() {
                if (!c) {
                  var e = i(d);
                  c = !0;
                  for (var t = o.length; t; ) {
                    for (r = o, o = []; ++u < t; ) r && r[u].run();
                    ((u = -1), (t = o.length));
                  }
                  ((r = null),
                    (c = !1),
                    (function (e) {
                      if (n === clearTimeout) return clearTimeout(e);
                      if ((n === l || !n) && clearTimeout)
                        return ((n = clearTimeout), clearTimeout(e));
                      try {
                        n(e);
                      } catch (t) {
                        try {
                          return n.call(null, e);
                        } catch (t) {
                          return n.call(this, e);
                        }
                      }
                    })(e));
                }
              }
              function h(e, t) {
                ((this.fun = e), (this.array = t));
              }
              function f() {}
              ((s.nextTick = function (e) {
                var t = Array(arguments.length - 1);
                if (arguments.length > 1)
                  for (var n = 1; n < arguments.length; n++) t[n - 1] = arguments[n];
                (o.push(new h(e, t)), 1 !== o.length || c || i(m));
              }),
                (h.prototype.run = function () {
                  this.fun.apply(null, this.array);
                }),
                (s.title = "browser"),
                (s.browser = !0),
                (s.env = {}),
                (s.argv = []),
                (s.version = ""),
                (s.versions = {}),
                (s.on = f),
                (s.addListener = f),
                (s.once = f),
                (s.off = f),
                (s.removeListener = f),
                (s.removeAllListeners = f),
                (s.emit = f),
                (s.prependListener = f),
                (s.prependOnceListener = f),
                (s.listeners = function (e) {
                  return [];
                }),
                (s.binding = function (e) {
                  throw Error("process.binding is not supported");
                }),
                (s.cwd = function () {
                  return "/";
                }),
                (s.chdir = function (e) {
                  throw Error("process.chdir is not supported");
                }),
                (s.umask = function () {
                  return 0;
                }));
            },
          },
          n = {};
        function r(e) {
          var s = n[e];
          if (void 0 !== s) return s.exports;
          var a = (n[e] = { exports: {} }),
            l = !0;
          try {
            (t[e](a, a.exports, r), (l = !1));
          } finally {
            l && delete n[e];
          }
          return a.exports;
        }
        r.ab = "//";
        var s = r(229);
        e.exports = s;
      })();
    },
  },
  function (e) {
    (e.O(0, [285, 749, 744], function () {
      return e((e.s = 4590));
    }),
      (_N_E = e.O()));
  },
]);
