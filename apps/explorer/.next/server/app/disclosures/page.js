(() => {
  var e = {};
  ((e.id = 739),
    (e.ids = [739]),
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
      2583: (e, t, r) => {
        "use strict";
        (r.r(t),
          r.d(t, {
            GlobalError: () => a.a,
            __next_app__: () => h,
            originalPathname: () => d,
            pages: () => c,
            routeModule: () => u,
            tree: () => f,
          }),
          r(3268),
          r(1595),
          r(8714));
        var n = r(3653),
          i = r(4966),
          s = r(6070),
          a = r.n(s),
          o = r(2555),
          l = {};
        for (let e in o)
          0 >
            [
              "default",
              "tree",
              "pages",
              "GlobalError",
              "originalPathname",
              "__next_app__",
              "routeModule",
            ].indexOf(e) && (l[e] = () => o[e]);
        r.d(t, l);
        let f = [
            "",
            {
              children: [
                "disclosures",
                {
                  children: [
                    "__PAGE__",
                    {},
                    {
                      page: [
                        () => Promise.resolve().then(r.bind(r, 3268)),
                        "/Users/arun/erabi/apps/explorer/app/disclosures/page.tsx",
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
          c = ["/Users/arun/erabi/apps/explorer/app/disclosures/page.tsx"],
          d = "/disclosures/page",
          h = { require: r, loadChunk: () => Promise.resolve() },
          u = new n.AppPageRouteModule({
            definition: {
              kind: i.x.APP_PAGE,
              page: "/disclosures/page",
              pathname: "/disclosures",
              bundlePath: "",
              filename: "",
              appPaths: [],
            },
            userland: { loaderTree: f },
          });
      },
      2316: (e, t, r) => {
        Promise.resolve().then(r.bind(r, 3245));
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
      3245: (e, t, r) => {
        "use strict";
        let n, i;
        (r.r(t), r.d(t, { default: () => eZ }));
        var s = r(2064),
          a = r(5032);
        let {
            p: o,
            n: l,
            Gx: f,
            Gy: c,
            a: d,
            d: h,
          } = {
            p: 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffedn,
            n: 0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn,
            h: 8n,
            a: 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffecn,
            d: 0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3n,
            Gx: 0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an,
            Gy: 0x6666666666666666666666666666666666666666666666666666666666666658n,
          },
          u = 32,
          b = (e = "") => {
            throw Error(e);
          },
          x = (e) => "bigint" == typeof e,
          p = (e) => "string" == typeof e,
          g = (e) =>
            e instanceof Uint8Array ||
            (ArrayBuffer.isView(e) && "Uint8Array" === e.constructor.name),
          m = (e, t) =>
            !g(e) || ("number" == typeof t && t > 0 && e.length !== t)
              ? b("Uint8Array expected")
              : e,
          y = (e) => new Uint8Array(e),
          w = (e) => Uint8Array.from(e),
          v = (e, t) => e.toString(16).padStart(t, "0"),
          A = (e) =>
            Array.from(m(e))
              .map((e) => v(e, 2))
              .join(""),
          E = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 },
          N = (e) =>
            e >= E._0 && e <= E._9
              ? e - E._0
              : e >= E.A && e <= E.F
                ? e - (E.A - 10)
                : e >= E.a && e <= E.f
                  ? e - (E.a - 10)
                  : void 0,
          j = (e) => {
            let t = "hex invalid";
            if (!p(e)) return b(t);
            let r = e.length,
              n = r / 2;
            if (r % 2) return b(t);
            let i = y(n);
            for (let r = 0, s = 0; r < n; r++, s += 2) {
              let n = N(e.charCodeAt(s)),
                a = N(e.charCodeAt(s + 1));
              if (void 0 === n || void 0 === a) return b(t);
              i[r] = 16 * n + a;
            }
            return i;
          },
          _ = (e, t) => m(p(e) ? j(e) : w(m(e)), t),
          U = () => globalThis?.crypto,
          B = () => U()?.subtle ?? b("crypto.subtle must be defined"),
          S = (...e) => {
            let t = y(e.reduce((e, t) => e + m(t).length, 0)),
              r = 0;
            return (
              e.forEach((e) => {
                (t.set(e, r), (r += e.length));
              }),
              t
            );
          },
          I = BigInt,
          P = (e, t, r, n = "bad number: out of range") => (x(e) && t <= e && e < r ? e : b(n)),
          T = (e, t = o) => {
            let r = e % t;
            return r >= 0n ? r : t + r;
          },
          L = (e) => T(e, l),
          R = (e, t) => {
            (0n === e || t <= 0n) && b("no inverse n=" + e + " mod=" + t);
            let r = T(e, t),
              n = t,
              i = 0n,
              s = 1n,
              a = 1n,
              o = 0n;
            for (; 0n !== r; ) {
              let e = n / r,
                t = n % r,
                l = i - a * e,
                f = s - o * e;
              ((n = r), (r = t), (i = a), (s = o), (a = l), (o = f));
            }
            return 1n === n ? T(i, t) : b("no inverse");
          },
          $ = (e) => {
            let t = Y[e];
            return ("function" != typeof t && b("hashes." + e + " not set"), t);
          },
          k = (e) => (e instanceof O ? e : b("Point expected")),
          C = 2n ** 256n;
        class O {
          static BASE;
          static ZERO;
          ex;
          ey;
          ez;
          et;
          constructor(e, t, r, n) {
            ((this.ex = P(e, 0n, C)),
              (this.ey = P(t, 0n, C)),
              (this.ez = P(r, 1n, C)),
              (this.et = P(n, 0n, C)),
              Object.freeze(this));
          }
          static fromAffine(e) {
            return new O(e.x, e.y, 1n, T(e.x * e.y));
          }
          static fromBytes(e, t = !1) {
            let r = w(m(e, u)),
              n = e[31];
            r[31] = -129 & n;
            let i = q(r);
            P(i, 0n, t ? C : o);
            let s = T(i * i),
              { isValid: a, value: l } = V(T(s - 1n), T(h * s + 1n));
            a || b("bad point: y not sqrt");
            let f = (1n & l) === 1n,
              c = (128 & n) != 0;
            return (
              !t && 0n === l && c && b("bad point: x==0, isLastByteOdd"),
              c !== f && (l = T(-l)),
              new O(l, i, 1n, T(l * i))
            );
          }
          assertValidity() {
            if (this.is0()) throw Error("bad point: ZERO");
            let { ex: e, ey: t, ez: r, et: n } = this,
              i = T(e * e),
              s = T(t * t),
              a = T(r * r),
              o = T(a * a),
              l = T(i * d);
            if (T(a * T(l + s)) !== T(o + T(h * T(i * s))))
              throw Error("bad point: equation left != right (1)");
            if (T(e * t) !== T(r * n)) throw Error("bad point: equation left != right (2)");
            return this;
          }
          equals(e) {
            let { ex: t, ey: r, ez: n } = this,
              { ex: i, ey: s, ez: a } = k(e),
              o = T(t * a),
              l = T(i * n),
              f = T(r * a),
              c = T(s * n);
            return o === l && f === c;
          }
          is0() {
            return this.equals(z);
          }
          negate() {
            return new O(T(-this.ex), this.ey, this.ez, T(-this.et));
          }
          double() {
            let { ex: e, ey: t, ez: r } = this,
              n = T(e * e),
              i = T(t * t),
              s = T(2n * T(r * r)),
              a = T(d * n),
              o = e + t,
              l = T(T(o * o) - n - i),
              f = a + i,
              c = f - s,
              h = a - i,
              u = T(l * c),
              b = T(f * h),
              x = T(l * h);
            return new O(u, b, T(c * f), x);
          }
          add(e) {
            let { ex: t, ey: r, ez: n, et: i } = this,
              { ex: s, ey: a, ez: o, et: l } = k(e),
              f = T(t * s),
              c = T(r * a),
              u = T(i * h * l),
              b = T(n * o),
              x = T((t + r) * (s + a) - f - c),
              p = T(b - u),
              g = T(b + u),
              m = T(c - d * f),
              y = T(x * p),
              w = T(g * m),
              v = T(x * m);
            return new O(y, w, T(p * g), v);
          }
          multiply(e, t = !0) {
            if (!t && (0n === e || this.is0())) return z;
            if ((P(e, 1n, l), 1n === e)) return this;
            if (this.equals(H)) return er(e).p;
            let r = z,
              n = H;
            for (let i = this; e > 0n; i = i.double(), e >>= 1n)
              1n & e ? (r = r.add(i)) : t && (n = n.add(i));
            return r;
          }
          toAffine() {
            let { ex: e, ey: t, ez: r } = this;
            if (this.equals(z)) return { x: 0n, y: 1n };
            let n = R(r, o);
            return (1n !== T(r * n) && b("invalid inverse"), { x: T(e * n), y: T(t * n) });
          }
          toBytes() {
            let { x: e, y: t } = this.assertValidity().toAffine(),
              r = G(t);
            return ((r[31] |= 1n & e ? 128 : 0), r);
          }
          toHex() {
            return A(this.toBytes());
          }
          clearCofactor() {
            return this.multiply(I(8n), !1);
          }
          isSmallOrder() {
            return this.clearCofactor().is0();
          }
          isTorsionFree() {
            let e = this.multiply(l / 2n, !1).double();
            return (l % 2n && (e = e.add(this)), e.is0());
          }
          static fromHex(e, t) {
            return O.fromBytes(_(e), t);
          }
          get x() {
            return this.toAffine().x;
          }
          get y() {
            return this.toAffine().y;
          }
          toRawBytes() {
            return this.toBytes();
          }
        }
        let H = new O(f, c, 1n, T(f * c)),
          z = new O(0n, 1n, 1n, 0n);
        ((O.BASE = H), (O.ZERO = z));
        let G = (e) => j(v(P(e, 0n, C), 64)).reverse(),
          q = (e) => I("0x" + A(w(m(e)).reverse())),
          F = (e, t) => {
            let r = e;
            for (; t-- > 0n; ) ((r *= r), (r %= o));
            return r;
          },
          D = (e) => {
            let t = (((e * e) % o) * e) % o,
              r = (F(t, 2n) * t) % o,
              n = (F(r, 1n) * e) % o,
              i = (F(n, 5n) * n) % o,
              s = (F(i, 10n) * i) % o,
              a = (F(s, 20n) * s) % o,
              l = (F(a, 40n) * a) % o,
              f = (F(l, 80n) * l) % o,
              c = (F(f, 80n) * l) % o,
              d = (F(c, 10n) * i) % o;
            return { pow_p_5_8: (F(d, 2n) * e) % o, b2: t };
          },
          V = (e, t) => {
            let r = T(t * t * t),
              n = D(e * T(r * r * t)).pow_p_5_8,
              i = T(e * r * n),
              s = T(t * i * i),
              a = i,
              o = T(0x2b8324804fc1df0b2b4d00993dfbd7a72f431806ad2fe478c4ee1b274a0ea0b0n * i),
              l = s === e,
              f = s === T(-e),
              c =
                s === T(-(0x2b8324804fc1df0b2b4d00993dfbd7a72f431806ad2fe478c4ee1b274a0ea0b0n * e));
            return (
              l && (i = a),
              (f || c) && (i = o),
              (1n & T(i)) === 1n && (i = T(-i)),
              { isValid: l || f, value: i }
            );
          },
          M = (e) => L(q(e)),
          X = (...e) => $("sha512Sync")(...e),
          J = (e) => e.finish(X(e.hashable)),
          Z = { zip215: !0 },
          K = (e, t, r, n = Z) => {
            let i, s, a, o;
            ((e = _(e, 64)), (t = _(t)), (r = _(r, u)));
            let { zip215: l } = n,
              f = Uint8Array.of();
            try {
              ((i = O.fromHex(r, l)),
                (s = O.fromHex(e.slice(0, u), l)),
                (a = q(e.slice(u, 64))),
                (o = H.multiply(a, !1)),
                (f = S(s.toBytes(), i.toBytes(), t)));
            } catch (e) {}
            return {
              hashable: f,
              finish: (e) => {
                if (null == o || (!l && i.isSmallOrder())) return !1;
                let t = M(e);
                return s.add(i.multiply(t, !1)).add(o.negate()).clearCofactor().is0();
              },
            };
          },
          W = (e, t, r, n = Z) => J(K(e, t, r, n)),
          Y = {
            sha512Async: async (...e) => {
              let t = B(),
                r = S(...e);
              return y(await t.digest("SHA-512", r.buffer));
            },
            sha512Sync: void 0,
            bytesToHex: A,
            hexToBytes: j,
            concatBytes: S,
            mod: T,
            invert: R,
            randomBytes: (e = u) => U().getRandomValues(y(e)),
          },
          Q = Math.ceil(32) + 1,
          ee = () => {
            let e = [],
              t = H,
              r = t;
            for (let n = 0; n < Q; n++) {
              ((r = t), e.push(r));
              for (let n = 1; n < 128; n++) ((r = r.add(t)), e.push(r));
              t = r.double();
            }
            return e;
          },
          et = (e, t) => {
            let r = t.negate();
            return e ? r : t;
          },
          er = (e) => {
            let t = n || (n = ee()),
              r = z,
              i = H,
              s = I(255),
              a = I(8);
            for (let n = 0; n < Q; n++) {
              let o = Number(e & s);
              ((e >>= a), o > 128 && ((o -= 256), (e += 1n)));
              let l = 128 * n,
                f = l + Math.abs(o) - 1,
                c = n % 2 != 0,
                d = o < 0;
              0 === o ? (i = i.add(et(c, t[l]))) : (r = r.add(et(d, t[f])));
            }
            return { p: r, f: i };
          };
        function en(e, ...t) {
          if (
            !(
              e instanceof Uint8Array ||
              (ArrayBuffer.isView(e) && "Uint8Array" === e.constructor.name)
            )
          )
            throw Error("Uint8Array expected");
          if (t.length > 0 && !t.includes(e.length))
            throw Error("Uint8Array expected of length " + t + ", got length=" + e.length);
        }
        function ei(e, t = !0) {
          if (e.destroyed) throw Error("Hash instance has been destroyed");
          if (t && e.finished) throw Error("Hash#digest() has already been called");
        }
        function es(...e) {
          for (let t = 0; t < e.length; t++) e[t].fill(0);
        }
        function ea(e) {
          return new DataView(e.buffer, e.byteOffset, e.byteLength);
        }
        function eo(e) {
          return (
            "string" == typeof e &&
              (e = (function (e) {
                if ("string" != typeof e) throw Error("string expected");
                return new Uint8Array(new TextEncoder().encode(e));
              })(e)),
            en(e),
            e
          );
        }
        class el {}
        class ef extends el {
          constructor(e, t, r, n) {
            (super(),
              (this.finished = !1),
              (this.length = 0),
              (this.pos = 0),
              (this.destroyed = !1),
              (this.blockLen = e),
              (this.outputLen = t),
              (this.padOffset = r),
              (this.isLE = n),
              (this.buffer = new Uint8Array(e)),
              (this.view = ea(this.buffer)));
          }
          update(e) {
            (ei(this), en((e = eo(e))));
            let { view: t, buffer: r, blockLen: n } = this,
              i = e.length;
            for (let s = 0; s < i; ) {
              let a = Math.min(n - this.pos, i - s);
              if (a === n) {
                let t = ea(e);
                for (; n <= i - s; s += n) this.process(t, s);
                continue;
              }
              (r.set(e.subarray(s, s + a), this.pos),
                (this.pos += a),
                (s += a),
                this.pos === n && (this.process(t, 0), (this.pos = 0)));
            }
            return ((this.length += e.length), this.roundClean(), this);
          }
          digestInto(e) {
            (ei(this),
              (function (e, t) {
                en(e);
                let r = t.outputLen;
                if (e.length < r)
                  throw Error("digestInto() expects output buffer of length at least " + r);
              })(e, this),
              (this.finished = !0));
            let { buffer: t, view: r, blockLen: n, isLE: i } = this,
              { pos: s } = this;
            ((t[s++] = 128),
              es(this.buffer.subarray(s)),
              this.padOffset > n - s && (this.process(r, 0), (s = 0)));
            for (let e = s; e < n; e++) t[e] = 0;
            ((function (e, t, r, n) {
              if ("function" == typeof e.setBigUint64) return e.setBigUint64(t, r, n);
              let i = BigInt(32),
                s = BigInt(4294967295),
                a = Number((r >> i) & s),
                o = Number(r & s),
                l = n ? 4 : 0,
                f = n ? 0 : 4;
              (e.setUint32(t + l, a, n), e.setUint32(t + f, o, n));
            })(r, n - 8, BigInt(8 * this.length), i),
              this.process(r, 0));
            let a = ea(e),
              o = this.outputLen;
            if (o % 4) throw Error("_sha2: outputLen should be aligned to 32bit");
            let l = o / 4,
              f = this.get();
            if (l > f.length) throw Error("_sha2: outputLen bigger than state");
            for (let e = 0; e < l; e++) a.setUint32(4 * e, f[e], i);
          }
          digest() {
            let { buffer: e, outputLen: t } = this;
            this.digestInto(e);
            let r = e.slice(0, t);
            return (this.destroy(), r);
          }
          _cloneInto(e) {
            (e || (e = new this.constructor()), e.set(...this.get()));
            let { blockLen: t, buffer: r, length: n, finished: i, destroyed: s, pos: a } = this;
            return (
              (e.destroyed = s),
              (e.finished = i),
              (e.length = n),
              (e.pos = a),
              n % t && e.buffer.set(r),
              e
            );
          }
          clone() {
            return this._cloneInto();
          }
        }
        let ec = Uint32Array.from([
            1779033703, 4089235720, 3144134277, 2227873595, 1013904242, 4271175723, 2773480762,
            1595750129, 1359893119, 2917565137, 2600822924, 725511199, 528734635, 4215389547,
            1541459225, 327033209,
          ]),
          ed = BigInt(4294967296 - 1),
          eh = BigInt(32),
          eu = (e, t, r) => e >>> r,
          eb = (e, t, r) => (e << (32 - r)) | (t >>> r),
          ex = (e, t, r) => (e >>> r) | (t << (32 - r)),
          ep = (e, t, r) => (e << (32 - r)) | (t >>> r),
          eg = (e, t, r) => (e << (64 - r)) | (t >>> (r - 32)),
          em = (e, t, r) => (e >>> (r - 32)) | (t << (64 - r));
        function ey(e, t, r, n) {
          let i = (t >>> 0) + (n >>> 0);
          return { h: (e + r + ((i / 4294967296) | 0)) | 0, l: 0 | i };
        }
        let ew = (e, t, r) => (e >>> 0) + (t >>> 0) + (r >>> 0),
          ev = (e, t, r, n) => (t + r + n + ((e / 4294967296) | 0)) | 0,
          eA = (e, t, r, n) => (e >>> 0) + (t >>> 0) + (r >>> 0) + (n >>> 0),
          eE = (e, t, r, n, i) => (t + r + n + i + ((e / 4294967296) | 0)) | 0,
          eN = (e, t, r, n, i) => (e >>> 0) + (t >>> 0) + (r >>> 0) + (n >>> 0) + (i >>> 0),
          ej = (e, t, r, n, i, s) => (t + r + n + i + s + ((e / 4294967296) | 0)) | 0,
          e_ = (function (e, t = !1) {
            let r = e.length,
              n = new Uint32Array(r),
              i = new Uint32Array(r);
            for (let s = 0; s < r; s++) {
              let { h: r, l: a } = (function (e, t = !1) {
                return t
                  ? { h: Number(e & ed), l: Number((e >> eh) & ed) }
                  : { h: 0 | Number((e >> eh) & ed), l: 0 | Number(e & ed) };
              })(e[s], t);
              [n[s], i[s]] = [r, a];
            }
            return [n, i];
          })(
            [
              "0x428a2f98d728ae22",
              "0x7137449123ef65cd",
              "0xb5c0fbcfec4d3b2f",
              "0xe9b5dba58189dbbc",
              "0x3956c25bf348b538",
              "0x59f111f1b605d019",
              "0x923f82a4af194f9b",
              "0xab1c5ed5da6d8118",
              "0xd807aa98a3030242",
              "0x12835b0145706fbe",
              "0x243185be4ee4b28c",
              "0x550c7dc3d5ffb4e2",
              "0x72be5d74f27b896f",
              "0x80deb1fe3b1696b1",
              "0x9bdc06a725c71235",
              "0xc19bf174cf692694",
              "0xe49b69c19ef14ad2",
              "0xefbe4786384f25e3",
              "0x0fc19dc68b8cd5b5",
              "0x240ca1cc77ac9c65",
              "0x2de92c6f592b0275",
              "0x4a7484aa6ea6e483",
              "0x5cb0a9dcbd41fbd4",
              "0x76f988da831153b5",
              "0x983e5152ee66dfab",
              "0xa831c66d2db43210",
              "0xb00327c898fb213f",
              "0xbf597fc7beef0ee4",
              "0xc6e00bf33da88fc2",
              "0xd5a79147930aa725",
              "0x06ca6351e003826f",
              "0x142929670a0e6e70",
              "0x27b70a8546d22ffc",
              "0x2e1b21385c26c926",
              "0x4d2c6dfc5ac42aed",
              "0x53380d139d95b3df",
              "0x650a73548baf63de",
              "0x766a0abb3c77b2a8",
              "0x81c2c92e47edaee6",
              "0x92722c851482353b",
              "0xa2bfe8a14cf10364",
              "0xa81a664bbc423001",
              "0xc24b8b70d0f89791",
              "0xc76c51a30654be30",
              "0xd192e819d6ef5218",
              "0xd69906245565a910",
              "0xf40e35855771202a",
              "0x106aa07032bbd1b8",
              "0x19a4c116b8d2d0c8",
              "0x1e376c085141ab53",
              "0x2748774cdf8eeb99",
              "0x34b0bcb5e19b48a8",
              "0x391c0cb3c5c95a63",
              "0x4ed8aa4ae3418acb",
              "0x5b9cca4f7763e373",
              "0x682e6ff3d6b2b8a3",
              "0x748f82ee5defb2fc",
              "0x78a5636f43172f60",
              "0x84c87814a1f0ab72",
              "0x8cc702081a6439ec",
              "0x90befffa23631e28",
              "0xa4506cebde82bde9",
              "0xbef9a3f7b2c67915",
              "0xc67178f2e372532b",
              "0xca273eceea26619c",
              "0xd186b8c721c0c207",
              "0xeada7dd6cde0eb1e",
              "0xf57d4f7fee6ed178",
              "0x06f067aa72176fba",
              "0x0a637dc5a2c898a6",
              "0x113f9804bef90dae",
              "0x1b710b35131c471b",
              "0x28db77f523047d84",
              "0x32caab7b40c72493",
              "0x3c9ebe0a15c9bebc",
              "0x431d67c49c100d4c",
              "0x4cc5d4becb3e42b6",
              "0x597f299cfc657e2a",
              "0x5fcb6fab3ad6faec",
              "0x6c44198c4a475817",
            ].map((e) => BigInt(e)),
          ),
          eU = e_[0],
          eB = e_[1],
          eS = new Uint32Array(80),
          eI = new Uint32Array(80);
        class eP extends ef {
          constructor(e = 64) {
            (super(128, e, 16, !1),
              (this.Ah = 0 | ec[0]),
              (this.Al = 0 | ec[1]),
              (this.Bh = 0 | ec[2]),
              (this.Bl = 0 | ec[3]),
              (this.Ch = 0 | ec[4]),
              (this.Cl = 0 | ec[5]),
              (this.Dh = 0 | ec[6]),
              (this.Dl = 0 | ec[7]),
              (this.Eh = 0 | ec[8]),
              (this.El = 0 | ec[9]),
              (this.Fh = 0 | ec[10]),
              (this.Fl = 0 | ec[11]),
              (this.Gh = 0 | ec[12]),
              (this.Gl = 0 | ec[13]),
              (this.Hh = 0 | ec[14]),
              (this.Hl = 0 | ec[15]));
          }
          get() {
            let {
              Ah: e,
              Al: t,
              Bh: r,
              Bl: n,
              Ch: i,
              Cl: s,
              Dh: a,
              Dl: o,
              Eh: l,
              El: f,
              Fh: c,
              Fl: d,
              Gh: h,
              Gl: u,
              Hh: b,
              Hl: x,
            } = this;
            return [e, t, r, n, i, s, a, o, l, f, c, d, h, u, b, x];
          }
          set(e, t, r, n, i, s, a, o, l, f, c, d, h, u, b, x) {
            ((this.Ah = 0 | e),
              (this.Al = 0 | t),
              (this.Bh = 0 | r),
              (this.Bl = 0 | n),
              (this.Ch = 0 | i),
              (this.Cl = 0 | s),
              (this.Dh = 0 | a),
              (this.Dl = 0 | o),
              (this.Eh = 0 | l),
              (this.El = 0 | f),
              (this.Fh = 0 | c),
              (this.Fl = 0 | d),
              (this.Gh = 0 | h),
              (this.Gl = 0 | u),
              (this.Hh = 0 | b),
              (this.Hl = 0 | x));
          }
          process(e, t) {
            for (let r = 0; r < 16; r++, t += 4)
              ((eS[r] = e.getUint32(t)), (eI[r] = e.getUint32((t += 4))));
            for (let e = 16; e < 80; e++) {
              let t = 0 | eS[e - 15],
                r = 0 | eI[e - 15],
                n = ex(t, r, 1) ^ ex(t, r, 8) ^ eu(t, r, 7),
                i = ep(t, r, 1) ^ ep(t, r, 8) ^ eb(t, r, 7),
                s = 0 | eS[e - 2],
                a = 0 | eI[e - 2],
                o = ex(s, a, 19) ^ eg(s, a, 61) ^ eu(s, a, 6),
                l = eA(i, ep(s, a, 19) ^ em(s, a, 61) ^ eb(s, a, 6), eI[e - 7], eI[e - 16]),
                f = eE(l, n, o, eS[e - 7], eS[e - 16]);
              ((eS[e] = 0 | f), (eI[e] = 0 | l));
            }
            let {
              Ah: r,
              Al: n,
              Bh: i,
              Bl: s,
              Ch: a,
              Cl: o,
              Dh: l,
              Dl: f,
              Eh: c,
              El: d,
              Fh: h,
              Fl: u,
              Gh: b,
              Gl: x,
              Hh: p,
              Hl: g,
            } = this;
            for (let e = 0; e < 80; e++) {
              let t = ex(c, d, 14) ^ ex(c, d, 18) ^ eg(c, d, 41),
                m = ep(c, d, 14) ^ ep(c, d, 18) ^ em(c, d, 41),
                y = (c & h) ^ (~c & b),
                w = eN(g, m, (d & u) ^ (~d & x), eB[e], eI[e]),
                v = ej(w, p, t, y, eU[e], eS[e]),
                A = 0 | w,
                E = ex(r, n, 28) ^ eg(r, n, 34) ^ eg(r, n, 39),
                N = ep(r, n, 28) ^ em(r, n, 34) ^ em(r, n, 39),
                j = (r & i) ^ (r & a) ^ (i & a),
                _ = (n & s) ^ (n & o) ^ (s & o);
              ((p = 0 | b),
                (g = 0 | x),
                (b = 0 | h),
                (x = 0 | u),
                (h = 0 | c),
                (u = 0 | d),
                ({ h: c, l: d } = ey(0 | l, 0 | f, 0 | v, 0 | A)),
                (l = 0 | a),
                (f = 0 | o),
                (a = 0 | i),
                (o = 0 | s),
                (i = 0 | r),
                (s = 0 | n));
              let U = ew(A, N, _);
              ((r = ev(U, v, E, j)), (n = 0 | U));
            }
            (({ h: r, l: n } = ey(0 | this.Ah, 0 | this.Al, 0 | r, 0 | n)),
              ({ h: i, l: s } = ey(0 | this.Bh, 0 | this.Bl, 0 | i, 0 | s)),
              ({ h: a, l: o } = ey(0 | this.Ch, 0 | this.Cl, 0 | a, 0 | o)),
              ({ h: l, l: f } = ey(0 | this.Dh, 0 | this.Dl, 0 | l, 0 | f)),
              ({ h: c, l: d } = ey(0 | this.Eh, 0 | this.El, 0 | c, 0 | d)),
              ({ h: h, l: u } = ey(0 | this.Fh, 0 | this.Fl, 0 | h, 0 | u)),
              ({ h: b, l: x } = ey(0 | this.Gh, 0 | this.Gl, 0 | b, 0 | x)),
              ({ h: p, l: g } = ey(0 | this.Hh, 0 | this.Hl, 0 | p, 0 | g)),
              this.set(r, n, i, s, a, o, l, f, c, d, h, u, b, x, p, g));
          }
          roundClean() {
            es(eS, eI);
          }
          destroy() {
            (es(this.buffer), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
          }
        }
        let eT = (function (e) {
          let t = (t) => e().update(eo(t)).digest(),
            r = e();
          return (
            (t.outputLen = r.outputLen),
            (t.blockLen = r.blockLen),
            (t.create = () => e()),
            t
          );
        })(() => new eP());
        function eL(e, t) {
          return (
            !!Array.isArray(t) &&
            (0 === t.length ||
              (e ? t.every((e) => "string" == typeof e) : t.every((e) => Number.isSafeInteger(e))))
          );
        }
        function eR(e, t) {
          if ("string" != typeof t) throw Error(`${e}: string expected`);
          return !0;
        }
        function e$(e) {
          if (!Number.isSafeInteger(e)) throw Error(`invalid integer: ${e}`);
        }
        function ek(e) {
          if (!Array.isArray(e)) throw Error("array expected");
        }
        function eC(e, t) {
          if (!eL(!0, t)) throw Error(`${e}: array of strings expected`);
        }
        function eO(...e) {
          let t = (e) => e,
            r = (e, t) => (r) => e(t(r));
          return {
            encode: e.map((e) => e.encode).reduceRight(r, t),
            decode: e.map((e) => e.decode).reduce(r, t),
          };
        }
        function eH(e) {
          let t = "string" == typeof e ? e.split("") : e,
            r = t.length;
          eC("alphabet", t);
          let n = new Map(t.map((e, t) => [e, t]));
          return {
            encode: (n) => (
              ek(n),
              n.map((n) => {
                if (!Number.isSafeInteger(n) || n < 0 || n >= r)
                  throw Error(
                    `alphabet.encode: digit index outside alphabet "${n}". Allowed: ${e}`,
                  );
                return t[n];
              })
            ),
            decode: (t) => (
              ek(t),
              t.map((t) => {
                eR("alphabet.decode", t);
                let r = n.get(t);
                if (void 0 === r) throw Error(`Unknown letter: "${t}". Allowed: ${e}`);
                return r;
              })
            ),
          };
        }
        function ez(e = "") {
          return (
            eR("join", e),
            {
              encode: (t) => (eC("join.decode", t), t.join(e)),
              decode: (t) => (eR("join.decode", t), t.split(e)),
            }
          );
        }
        function eG(e, t, r) {
          if (t < 2) throw Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
          if (r < 2) throw Error(`convertRadix: invalid to=${r}, base cannot be less than 2`);
          if ((ek(e), !e.length)) return [];
          let n = 0,
            i = [],
            s = Array.from(e, (e) => {
              if ((e$(e), e < 0 || e >= t)) throw Error(`invalid integer: ${e}`);
              return e;
            }),
            a = s.length;
          for (;;) {
            let e = 0,
              o = !0;
            for (let i = n; i < a; i++) {
              let a = s[i],
                l = t * e,
                f = l + a;
              if (!Number.isSafeInteger(f) || l / t !== e || f - a !== l)
                throw Error("convertRadix: carry overflow");
              let c = f / r;
              e = f % r;
              let d = Math.floor(c);
              if (((s[i] = d), !Number.isSafeInteger(d) || d * r + e !== f))
                throw Error("convertRadix: carry overflow");
              o && (d ? (o = !1) : (n = i));
            }
            if ((i.push(e), o)) break;
          }
          for (let t = 0; t < e.length - 1 && 0 === e[t]; t++) i.push(0);
          return i.reverse();
        }
        let eq = (e, t) => (0 === t ? e : eq(t, e % t)),
          eF = (e, t) => e + (t - eq(e, t)),
          eD = (() => {
            let e = [];
            for (let t = 0; t < 40; t++) e.push(2 ** t);
            return e;
          })();
        "function" == typeof Uint8Array.from([]).toBase64 && Uint8Array.fromBase64;
        let eV =
            ((i = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"),
            eO(
              (e$(58),
              {
                encode: (e) => {
                  if (
                    !(function (e) {
                      return (
                        e instanceof Uint8Array ||
                        (ArrayBuffer.isView(e) && "Uint8Array" === e.constructor.name)
                      );
                    })(e)
                  )
                    throw Error("radix.encode input should be Uint8Array");
                  return eG(Array.from(e), 256, 58);
                },
                decode: (e) => (
                  (function (e, t) {
                    if (!eL(!1, t)) throw Error(`${e}: array of numbers expected`);
                  })("radix.decode", e),
                  Uint8Array.from(eG(e, 58, 256))
                ),
              }),
              eH(i),
              ez(""),
            )),
          eM = [996825010, 642813549, 513874426, 1027748829, 705979059];
        ("function" == typeof Uint8Array.from([]).toHex && Uint8Array.fromHex,
          Object.values({
            data: ["data.financial", "data.news", "data.registry", "data.geo", "data.market"],
            api: [
              "api.fraud-scoring",
              "api.identity",
              "api.shipping",
              "api.tax",
              "api.pricing",
              "api.search",
            ],
            agent: [
              "agent.research",
              "agent.analysis",
              "agent.coding",
              "agent.content",
              "agent.negotiation",
            ],
            compute: ["compute.inference", "compute.gpu", "compute.storage"],
            commerce: ["commerce.retail", "commerce.travel", "commerce.local"],
          }).flat(),
          (Y.sha512Sync = (...e) => eT(Y.concatBytes(...e))));
        let eX = "ed25519:";
        (new TextEncoder(), new TextEncoder());
        var eJ = r(2856);
        function eZ() {
          let [e, t] = (0, a.useState)(""),
            [r, n] = (0, a.useState)(null),
            [i, o] = (0, a.useState)("idle"),
            [l, f] = (0, a.useState)(null);
          async function c(t) {
            (t.preventDefault(), f(null), n(null), o("idle"));
            let r = await (0, eJ.L)(
              `${eJ.b.exchange}/v1/disclosures/${encodeURIComponent(e.trim())}`,
            );
            if (!r) {
              f("no disclosure with that id on this node");
              return;
            }
            n(r);
            let i = await (0, eJ.L)(`${eJ.b.exchange}/.well-known/erabi.json`);
            if (!i?.exchange_public_key) {
              o("no-key");
              return;
            }
            let { exchange_sig: s, ...a } = r;
            o(
              !(function (e, t, r) {
                let n;
                try {
                  n = (function (e) {
                    if (!e.startsWith(eX))
                      throw TypeError(`signatureFromString: missing "${eX}" prefix`);
                    let t = eV.decode(e.slice(eX.length));
                    if (64 !== t.length)
                      throw TypeError(
                        `signatureFromString: expected 64-byte signature, got ${t.length}`,
                      );
                    return t;
                  })(t);
                } catch {
                  return !1;
                }
                return W(n, e, r);
              })(
                new TextEncoder().encode(
                  (function e(t) {
                    if (null === t) return "null";
                    switch (typeof t) {
                      case "boolean":
                        return t ? "true" : "false";
                      case "number":
                        if (!Number.isFinite(t))
                          throw TypeError(`canonicalize: non-finite number ${t} is not valid JSON`);
                        return JSON.stringify(t);
                      case "string":
                        return JSON.stringify(t);
                      case "object": {
                        if (Array.isArray(t)) return `[${t.map((t) => e(t)).join(",")}]`;
                        let r = Object.keys(t).sort(),
                          n = [];
                        for (let i of r) {
                          let r = t[i];
                          if (void 0 === r)
                            throw TypeError(
                              `canonicalize: property "${i}" is undefined and cannot be signed`,
                            );
                          n.push(`${JSON.stringify(i)}:${e(r)}`);
                        }
                        return `{${n.join(",")}}`;
                      }
                      default:
                        throw TypeError(
                          `canonicalize: cannot canonicalize value of type ${typeof t}`,
                        );
                    }
                  })(a),
                ),
                s,
                (function (e) {
                  if (!e.startsWith(eX))
                    throw TypeError(`publicKeyFromString: missing "${eX}" prefix`);
                  let t = eV.decode(e.slice(eX.length));
                  if (32 !== t.length)
                    throw TypeError(`publicKeyFromString: expected 32-byte key, got ${t.length}`);
                  return t;
                })(i.exchange_public_key),
              )
                ? "invalid"
                : "valid",
            );
          }
          return (0, s.jsxs)("main", {
            className: "space-y-6",
            children: [
              (0, s.jsxs)("section", {
                className: "panel",
                children: [
                  s.jsx("h1", { className: "label mb-2", children: "disclosure inspector" }),
                  s.jsx("p", {
                    className: "mb-4 text-xs text-terminal-dim",
                    children:
                      "paste any disclosure_id: the full signed who-paid-what record is fetched and its ed25519 signature verified in your browser against the exchange's published key.",
                  }),
                  (0, s.jsxs)("form", {
                    onSubmit: c,
                    className: "flex gap-2",
                    children: [
                      s.jsx("input", {
                        value: e,
                        onChange: (e) => t(e.target.value),
                        placeholder: "disclosure_id (uuid)",
                        className:
                          "flex-1 rounded border border-terminal-border bg-terminal-bg px-2 py-1 text-xs outline-none focus:border-terminal-green",
                      }),
                      s.jsx("button", {
                        type: "submit",
                        className:
                          "rounded border border-terminal-green px-3 py-1 text-xs text-terminal-green hover:bg-terminal-green hover:text-terminal-bg",
                        children: "inspect",
                      }),
                    ],
                  }),
                  l && s.jsx("p", { className: "mt-3 text-xs text-terminal-red", children: l }),
                ],
              }),
              r &&
                (0, s.jsxs)("section", {
                  className: "panel",
                  children: [
                    (0, s.jsxs)("div", {
                      className: "mb-3 flex items-center justify-between",
                      children: [
                        s.jsx("h2", { className: "label", children: "record" }),
                        "valid" === i &&
                          s.jsx("span", {
                            className: "text-xs text-terminal-green",
                            children: "✓ signature verified in-browser",
                          }),
                        "invalid" === i &&
                          s.jsx("span", {
                            className: "text-xs text-terminal-red",
                            children: "✗ SIGNATURE INVALID",
                          }),
                        "no-key" === i &&
                          s.jsx("span", {
                            className: "text-xs text-terminal-amber",
                            children: "exchange key unavailable",
                          }),
                      ],
                    }),
                    s.jsx("dl", {
                      className: "space-y-1 text-xs",
                      children: Object.entries(r).map(([e, t]) =>
                        (0, s.jsxs)(
                          "div",
                          {
                            className: "flex gap-4",
                            children: [
                              s.jsx("dt", {
                                className: "w-40 shrink-0 text-terminal-dim",
                                children: e,
                              }),
                              s.jsx("dd", {
                                className: "break-all",
                                children:
                                  "provider_id" === e
                                    ? s.jsx("a", {
                                        href: `/agents/${encodeURIComponent(String(t))}`,
                                        className: "hover:text-terminal-green",
                                        children: String(t),
                                      })
                                    : String(t),
                              }),
                            ],
                          },
                          e,
                        ),
                      ),
                    }),
                  ],
                }),
            ],
          });
        }
      },
      2856: (e, t, r) => {
        "use strict";
        r.d(t, { L: () => i, b: () => n });
        let n = {
          registry: process.env.NEXT_PUBLIC_ERABI_REGISTRY_URL ?? "http://localhost:4001",
          exchange: process.env.NEXT_PUBLIC_ERABI_EXCHANGE_URL ?? "http://localhost:4002",
          attribution: process.env.NEXT_PUBLIC_ERABI_ATTRIBUTION_URL ?? "http://localhost:4003",
          reputation: process.env.NEXT_PUBLIC_ERABI_REPUTATION_URL ?? "http://localhost:4004",
        };
        async function i(e) {
          try {
            let t = await fetch(e, { cache: "no-store" });
            if (!t.ok) return null;
            return await t.json();
          } catch {
            return null;
          }
        }
      },
      3268: (e, t, r) => {
        "use strict";
        (r.r(t), r.d(t, { default: () => n }));
        let n = (0, r(1924).createProxy)(
          String.raw`/Users/arun/erabi/apps/explorer/app/disclosures/page.tsx#default`,
        );
      },
      1595: (e, t, r) => {
        "use strict";
        (r.r(t), r.d(t, { default: () => a, metadata: () => s }));
        var n = r(9222),
          i = r(3023);
        r(6557);
        let s = {
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
                      (0, n.jsxs)(i.default, {
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
                        className: "flex gap-6 text-sm",
                        children: [
                          n.jsx(i.default, {
                            href: "/",
                            className: "hover:text-terminal-green",
                            children: "ticker",
                          }),
                          n.jsx(i.default, {
                            href: "/disclosures",
                            className: "hover:text-terminal-green",
                            children: "disclosure inspector",
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
      6557: () => {},
    }));
  var t = require("../../webpack-runtime.js");
  t.C(e);
  var r = (e) => t((t.s = e)),
    n = t.X(0, [557], () => r(2583));
  module.exports = n;
})();
