import * as jose from "jose";

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const JWKS = jose.createRemoteJWKSet(
  new URL(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`)
);

export type GitHubOIDCClaims = {
  repository: string;
  actor: string;
  ref: string;
  sha: string;
  repository_owner: string;
};

export async function verifyGitHubOIDC(
  token: string
): Promise<GitHubOIDCClaims | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: GITHUB_OIDC_ISSUER,
      audience: "skylos",
    });
    return {
      repository: payload.repository as string,
      actor: payload.actor as string,
      ref: payload.ref as string,
      sha: payload.sha as string,
      repository_owner: payload.repository_owner as string,
    };
  } catch {
    return null;
  }
}
