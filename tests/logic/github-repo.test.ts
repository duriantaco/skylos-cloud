import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRepoUrlOrFilter,
  normalizeGitHubRepoUrl,
  parseGitHubRepoUrl,
} from "../../src/lib/github-repo-core";

test("normalizeGitHubRepoUrl canonicalizes supported GitHub URL formats", () => {
  assert.equal(
    normalizeGitHubRepoUrl("git@github.com:OpenAI/Repo.git"),
    "https://github.com/openai/repo"
  );
  assert.equal(
    normalizeGitHubRepoUrl("http://github.com/OpenAI/Repo/"),
    "https://github.com/openai/repo"
  );
  assert.equal(
    normalizeGitHubRepoUrl("github.com/OpenAI/Repo"),
    "https://github.com/openai/repo"
  );
});

test("parseGitHubRepoUrl returns owner and repo from canonicalized URLs", () => {
  assert.deepEqual(parseGitHubRepoUrl("https://github.com/OpenAI/Repo.git"), {
    owner: "openai",
    repo: "repo",
  });
});

test("buildRepoUrlOrFilter includes canonical and .git variants", () => {
  assert.equal(
    buildRepoUrlOrFilter("git@github.com:OpenAI/Repo.git"),
    "repo_url.eq.https://github.com/openai/repo,repo_url.eq.https://github.com/openai/repo.git"
  );
});
