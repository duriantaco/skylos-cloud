import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

const APP_ID = process.env.GITHUB_APP_ID!;
const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY!;

export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const auth = createAppAuth({
    appId: APP_ID,
    privateKey: PRIVATE_KEY,
    installationId,
  });
  
  const { token } = await auth({ type: "installation" });
  return new Octokit({ auth: token });
}