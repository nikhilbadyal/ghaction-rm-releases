import { info, setFailed } from "@actions/core"
import { getMyOctokit, rmReleases } from "./github"
import { getInputs, type ActionInputs } from "./utils"
import type { GitHub } from "@actions/github/lib/utils"

let octokit: InstanceType<typeof GitHub>
let inputs: ActionInputs

function setupGitHub(): void {
  info("Getting gitHub Token")
  octokit = getMyOctokit(inputs.GITHUB_TOKEN)
}

function setUp(): void {
  inputs = getInputs()
  setupGitHub()
}
async function run(): Promise<void> {
  try {
    setUp()
    await rmReleases({
      daysToKeep: inputs.DAYS_TO_KEEP,
      deleteDraftReleasesOnly: inputs.DELETE_DRAFT_RELEASES_ONLY,
      deletePrereleasesOnly: inputs.DELETE_PRERELEASES_ONLY,
      dryRun: inputs.DRY_RUN,
      excludePattern: inputs.EXCLUDE_PATTERN,
      octokit,
      releasePattern: inputs.RELEASE_PATTERN,
      releasesToKeep: inputs.RELEASES_TO_KEEP,
      targetBranchPattern: inputs.TARGET_BRANCH_PATTERN
    })
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error))
  }
}

// noinspection JSIgnoredPromiseFromCall
run()
