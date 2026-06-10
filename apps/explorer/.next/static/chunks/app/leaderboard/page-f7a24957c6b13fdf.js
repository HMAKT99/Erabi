(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [173],
  {
    7031: function (e, t, n) {
      Promise.resolve().then(n.bind(n, 5016));
    },
    5016: function (e, t, n) {
      "use strict";
      (n.r(t),
        n.d(t, {
          default: function () {
            return a;
          },
        }));
      var r = n(5853),
        i = n(4254),
        s = n(7800);
      function a() {
        let [e, t] = (0, i.useState)([]),
          [n, a] = (0, i.useState)([]);
        return (
          (0, i.useEffect)(() => {
            (async () => {
              var e, n;
              let r = await (0, s.L)("".concat(s.b.attribution, "/v1/stats/earnings"));
              t(null !== (e = null == r ? void 0 : r.top_earners) && void 0 !== e ? e : []);
              let i = await (0, s.L)("".concat(s.b.registry, "/v1/agents"));
              a(
                (null !== (n = null == i ? void 0 : i.agents) && void 0 !== n ? n : [])
                  .sort((e, t) => t.reputation - e.reputation)
                  .slice(0, 15),
              );
            })();
          }, []),
          (0, r.jsxs)("main", {
            className: "grid gap-6 md:grid-cols-2",
            children: [
              (0, r.jsxs)("section", {
                className: "panel",
                children: [
                  (0, r.jsx)("h1", {
                    className: "label mb-3",
                    children: "top earners — confirmed, dual-signed, public",
                  }),
                  0 === e.length
                    ? (0, r.jsx)("p", {
                        className: "text-xs text-terminal-dim",
                        children: "no settlements yet.",
                      })
                    : (0, r.jsx)("table", {
                        className: "w-full text-xs",
                        children: (0, r.jsx)("tbody", {
                          children: e.map((e, t) => {
                            var n;
                            return (0, r.jsxs)(
                              "tr",
                              {
                                className: "border-b border-terminal-border",
                                children: [
                                  (0, r.jsxs)("td", {
                                    className: "py-1.5 pr-2 text-terminal-dim",
                                    children: ["#", t + 1],
                                  }),
                                  (0, r.jsx)("td", {
                                    className: "py-1.5",
                                    children: (0, r.jsx)("a", {
                                      href: "/agents/".concat(encodeURIComponent(e.agent_id)),
                                      className: "hover:text-terminal-green",
                                      children:
                                        null !== (n = e.name) && void 0 !== n
                                          ? n
                                          : e.agent_id.slice(0, 28),
                                    }),
                                  }),
                                  (0, r.jsxs)("td", {
                                    className: "py-1.5 text-right text-terminal-green",
                                    children: ["$", e.earned_usd.toFixed(4)],
                                  }),
                                  (0, r.jsxs)("td", {
                                    className: "py-1.5 pl-2 text-right text-terminal-dim",
                                    children: [e.entries, " entr", 1 === e.entries ? "y" : "ies"],
                                  }),
                                ],
                              },
                              e.agent_id,
                            );
                          }),
                        }),
                      }),
                  (0, r.jsxs)("p", {
                    className: "mt-3 text-[10px] text-terminal-dim",
                    children: ["machine-readable: GET ", s.b.attribution, "/v1/stats/earnings"],
                  }),
                ],
              }),
              (0, r.jsxs)("section", {
                className: "panel",
                children: [
                  (0, r.jsx)("h1", {
                    className: "label mb-3",
                    children: "top reputation — verify the evidence, not the number",
                  }),
                  0 === n.length
                    ? (0, r.jsx)("p", {
                        className: "text-xs text-terminal-dim",
                        children: "no agents yet.",
                      })
                    : (0, r.jsx)("table", {
                        className: "w-full text-xs",
                        children: (0, r.jsx)("tbody", {
                          children: n.map((e, t) =>
                            (0, r.jsxs)(
                              "tr",
                              {
                                className: "border-b border-terminal-border",
                                children: [
                                  (0, r.jsxs)("td", {
                                    className: "py-1.5 pr-2 text-terminal-dim",
                                    children: ["#", t + 1],
                                  }),
                                  (0, r.jsx)("td", {
                                    className: "py-1.5",
                                    children: (0, r.jsx)("a", {
                                      href: "/agents/".concat(encodeURIComponent(e.manifest.id)),
                                      className: "hover:text-terminal-green",
                                      children: e.manifest.name,
                                    }),
                                  }),
                                  (0, r.jsx)("td", {
                                    className: "py-1.5 text-right text-terminal-green",
                                    children: e.reputation,
                                  }),
                                  (0, r.jsx)("td", {
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
          })
        );
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
        i,
        s,
        a,
        l = n(3206);
      let o = {
        registry:
          null !== (r = l.env.NEXT_PUBLIC_ERABI_REGISTRY_URL) && void 0 !== r
            ? r
            : "http://localhost:4001",
        exchange:
          null !== (i = l.env.NEXT_PUBLIC_ERABI_EXCHANGE_URL) && void 0 !== i
            ? i
            : "http://localhost:4002",
        attribution:
          null !== (s = l.env.NEXT_PUBLIC_ERABI_ATTRIBUTION_URL) && void 0 !== s
            ? s
            : "http://localhost:4003",
        reputation:
          null !== (a = l.env.NEXT_PUBLIC_ERABI_REPUTATION_URL) && void 0 !== a
            ? a
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
      var r, i;
      e.exports =
        (null == (r = n.g.process) ? void 0 : r.env) &&
        "object" == typeof (null == (i = n.g.process) ? void 0 : i.env)
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
                i = (e.exports = {});
              function s() {
                throw Error("setTimeout has not been defined");
              }
              function a() {
                throw Error("clearTimeout has not been defined");
              }
              function l(e) {
                if (t === setTimeout) return setTimeout(e, 0);
                if ((t === s || !t) && setTimeout) return ((t = setTimeout), setTimeout(e, 0));
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
                  t = "function" == typeof setTimeout ? setTimeout : s;
                } catch (e) {
                  t = s;
                }
                try {
                  n = "function" == typeof clearTimeout ? clearTimeout : a;
                } catch (e) {
                  n = a;
                }
              })();
              var o = [],
                c = !1,
                u = -1;
              function d() {
                c && r && ((c = !1), r.length ? (o = r.concat(o)) : (u = -1), o.length && h());
              }
              function h() {
                if (!c) {
                  var e = l(d);
                  c = !0;
                  for (var t = o.length; t; ) {
                    for (r = o, o = []; ++u < t; ) r && r[u].run();
                    ((u = -1), (t = o.length));
                  }
                  ((r = null),
                    (c = !1),
                    (function (e) {
                      if (n === clearTimeout) return clearTimeout(e);
                      if ((n === a || !n) && clearTimeout)
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
              function m(e, t) {
                ((this.fun = e), (this.array = t));
              }
              function f() {}
              ((i.nextTick = function (e) {
                var t = Array(arguments.length - 1);
                if (arguments.length > 1)
                  for (var n = 1; n < arguments.length; n++) t[n - 1] = arguments[n];
                (o.push(new m(e, t)), 1 !== o.length || c || l(h));
              }),
                (m.prototype.run = function () {
                  this.fun.apply(null, this.array);
                }),
                (i.title = "browser"),
                (i.browser = !0),
                (i.env = {}),
                (i.argv = []),
                (i.version = ""),
                (i.versions = {}),
                (i.on = f),
                (i.addListener = f),
                (i.once = f),
                (i.off = f),
                (i.removeListener = f),
                (i.removeAllListeners = f),
                (i.emit = f),
                (i.prependListener = f),
                (i.prependOnceListener = f),
                (i.listeners = function (e) {
                  return [];
                }),
                (i.binding = function (e) {
                  throw Error("process.binding is not supported");
                }),
                (i.cwd = function () {
                  return "/";
                }),
                (i.chdir = function (e) {
                  throw Error("process.chdir is not supported");
                }),
                (i.umask = function () {
                  return 0;
                }));
            },
          },
          n = {};
        function r(e) {
          var i = n[e];
          if (void 0 !== i) return i.exports;
          var s = (n[e] = { exports: {} }),
            a = !0;
          try {
            (t[e](s, s.exports, r), (a = !1));
          } finally {
            a && delete n[e];
          }
          return s.exports;
        }
        r.ab = "//";
        var i = r(229);
        e.exports = i;
      })();
    },
  },
  function (e) {
    (e.O(0, [285, 749, 744], function () {
      return e((e.s = 7031));
    }),
      (_N_E = e.O()));
  },
]);
