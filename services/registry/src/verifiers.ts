/**
 * Owner verification: proves control of an external identity anchor.
 * DNS TXT `erabi-verify=<agent id>` or a GitHub gist containing the same
 * token. The interface is mockable; real resolvers land behind it without
 * touching the service.
 */

export interface Verifier {
  /** e.g. "dns" or "github" — matches the prefix of owner.verification entries. */
  readonly scheme: string;
  /**
   * @param target what follows the scheme prefix (domain, github handle)
   * @param agentId the agent being verified; the proof must contain it
   */
  verify(target: string, agentId: string): Promise<boolean>;
}

export function verificationToken(agentId: string): string {
  return `erabi-verify=${agentId}`;
}

/** Mock DNS verifier: an in-memory map of domain → TXT records. */
export class MockDnsVerifier implements Verifier {
  readonly scheme = "dns";
  private readonly txtRecords = new Map<string, string[]>();

  setTxtRecords(domain: string, records: string[]): void {
    this.txtRecords.set(domain, records);
  }

  async verify(domain: string, agentId: string): Promise<boolean> {
    return (this.txtRecords.get(domain) ?? []).includes(verificationToken(agentId));
  }
}

/** Mock GitHub verifier: an in-memory map of handle → gist contents. */
export class MockGithubVerifier implements Verifier {
  readonly scheme = "github";
  private readonly gists = new Map<string, string[]>();

  setGists(handle: string, contents: string[]): void {
    this.gists.set(handle, contents);
  }

  async verify(handle: string, agentId: string): Promise<boolean> {
    return (this.gists.get(handle) ?? []).some((gist) => gist.includes(verificationToken(agentId)));
  }
}

export type VerifierSet = ReadonlyMap<string, Verifier>;

export function defaultVerifiers(): VerifierSet {
  // Dev default: mocks with no records — verification fails closed until
  // real resolvers are wired in or tests seed the mocks.
  const verifiers = [new MockDnsVerifier(), new MockGithubVerifier()];
  return new Map(verifiers.map((v) => [v.scheme, v]));
}

// ---- production verifiers ----

const DOMAIN_PATTERN =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const GITHUB_HANDLE_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** Real DNS verifier: looks for the token in the domain's TXT records. */
export class DnsTxtVerifier implements Verifier {
  readonly scheme = "dns";

  constructor(
    private readonly resolveTxt: (domain: string) => Promise<string[][]> = async (domain) => {
      const { resolveTxt } = await import("node:dns/promises");
      return resolveTxt(domain);
    },
  ) {}

  async verify(domain: string, agentId: string): Promise<boolean> {
    if (!DOMAIN_PATTERN.test(domain)) return false;
    try {
      const records = await this.resolveTxt(domain);
      const token = verificationToken(agentId);
      // TXT records may be chunked; each record's strings concatenate.
      return records.some((chunks) => chunks.join("") === token);
    } catch {
      return false; // NXDOMAIN, timeouts, etc. — fail closed
    }
  }
}

/**
 * Real GitHub verifier: looks for the token in the handle's recent public
 * gists (descriptions and small files).
 */
export class GithubGistVerifier implements Verifier {
  readonly scheme = "github";

  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly options: { maxGists?: number; maxFileBytes?: number; token?: string } = {},
  ) {}

  async verify(handle: string, agentId: string): Promise<boolean> {
    if (!GITHUB_HANDLE_PATTERN.test(handle)) return false;
    const token = verificationToken(agentId);
    const headers: Record<string, string> = {
      accept: "application/vnd.github+json",
      "user-agent": "erabi-registry",
    };
    if (this.options.token) headers.authorization = `Bearer ${this.options.token}`;

    try {
      const response = await this.fetchImpl(
        `https://api.github.com/users/${handle}/gists?per_page=${this.options.maxGists ?? 20}`,
        { headers },
      );
      if (!response.ok) return false;
      const gists = (await response.json()) as Array<{
        description: string | null;
        files: Record<string, { raw_url: string; size: number }>;
      }>;

      for (const gist of gists) {
        if (gist.description?.includes(token)) return true;
        for (const file of Object.values(gist.files ?? {})) {
          if (file.size > (this.options.maxFileBytes ?? 65_536)) continue;
          const raw = await this.fetchImpl(file.raw_url, { headers });
          if (raw.ok && (await raw.text()).includes(token)) return true;
        }
      }
      return false;
    } catch {
      return false; // network errors fail closed
    }
  }
}

/** Production verifier set: real DNS TXT + real GitHub gists. */
export function realVerifiers(options: { githubToken?: string } = {}): VerifierSet {
  const verifiers: Verifier[] = [
    new DnsTxtVerifier(),
    new GithubGistVerifier(fetch, { token: options.githubToken }),
  ];
  return new Map(verifiers.map((v) => [v.scheme, v]));
}
