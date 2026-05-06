// The default context mirrors the repository shape that production code reads through @actions/github.context.repo.
export const context = {
  // Tests that do not install a suite-local factory still get a realistic owner/repo pair instead of leaking host environment state.
  repo: {
    // The concrete owner keeps expectations stable when release helpers spread context.repo into mocked Octokit calls.
    owner: "nikhilbadyal",
    // The concrete repo keeps the shim aligned with existing test factories while remaining isolated from the real checkout name.
    repo: "test-repo"
  }
}

export function getOctokit(): never {
  // Production getOctokit would create a network-capable client, so unmocked tests should fail loudly instead of making accidental API calls.
  throw new Error("@actions/github getOctokit must be mocked in tests")
}
