import { describe, expect, it } from "vitest";
import { DnsTxtVerifier, GithubGistVerifier, verificationToken } from "../src/verifiers.js";

const AGENT = "erabi:agent:4XujsM2nKbeqApvNVMZRT8JcWcfMs5VRGsCdSqJpwy8d";
const TOKEN = verificationToken(AGENT);

describe("DnsTxtVerifier", () => {
  it("matches the token across chunked TXT records", async () => {
    const verifier = new DnsTxtVerifier(async (domain) => {
      expect(domain).toBe("agentcorp.example");
      // DNS TXT strings over 255 chars arrive chunked; chunks concatenate.
      return [["v=spf1 -all"], [TOKEN.slice(0, 20), TOKEN.slice(20)]];
    });
    expect(await verifier.verify("agentcorp.example", AGENT)).toBe(true);
  });

  it("fails closed on missing records, resolver errors, and bad domains", async () => {
    const noMatch = new DnsTxtVerifier(async () => [["something-else"]]);
    expect(await noMatch.verify("agentcorp.example", AGENT)).toBe(false);

    const nxdomain = new DnsTxtVerifier(async () => {
      throw new Error("ENOTFOUND");
    });
    expect(await nxdomain.verify("agentcorp.example", AGENT)).toBe(false);

    const verifier = new DnsTxtVerifier(async () => [[TOKEN]]);
    expect(await verifier.verify("not a domain!", AGENT)).toBe(false);
    expect(await verifier.verify("", AGENT)).toBe(false);
  });
});

describe("GithubGistVerifier", () => {
  function fakeGithub(gists: unknown[], files: Record<string, string>): typeof fetch {
    return (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/users/")) {
        return new Response(JSON.stringify(gists), { status: 200 });
      }
      const body = files[url];
      return body !== undefined
        ? new Response(body, { status: 200 })
        : new Response("not found", { status: 404 });
    }) as typeof fetch;
  }

  it("finds the token in a gist description", async () => {
    const verifier = new GithubGistVerifier(
      fakeGithub([{ description: `proving my agent: ${TOKEN}`, files: {} }], {}),
    );
    expect(await verifier.verify("octocat", AGENT)).toBe(true);
  });

  it("finds the token in a small gist file, skipping oversized ones", async () => {
    const verifier = new GithubGistVerifier(
      fakeGithub(
        [
          {
            description: null,
            files: {
              "huge.txt": { raw_url: "https://gist.example/huge", size: 10_000_000 },
              "erabi.txt": { raw_url: "https://gist.example/erabi", size: 64 },
            },
          },
        ],
        { "https://gist.example/erabi": `hello\n${TOKEN}\n` },
      ),
    );
    expect(await verifier.verify("octocat", AGENT)).toBe(true);
  });

  it("fails closed on API errors, missing tokens, and invalid handles", async () => {
    const apiDown = new GithubGistVerifier(
      (async () => new Response("", { status: 500 })) as typeof fetch,
    );
    expect(await apiDown.verify("octocat", AGENT)).toBe(false);

    const noToken = new GithubGistVerifier(fakeGithub([{ description: "nothing", files: {} }], {}));
    expect(await noToken.verify("octocat", AGENT)).toBe(false);
    expect(await noToken.verify("-invalid-", AGENT)).toBe(false);
  });
});
