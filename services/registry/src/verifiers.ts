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
