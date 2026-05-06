import { info, setFailed, setOutput } from "@actions/core"
import { getMyOctokit, rmReleases, type RmReleasesSummary } from "./github"
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
    const summary = await rmReleases({
      daysToKeep: inputs.DAYS_TO_KEEP,
      deleteDraftReleasesOnly: inputs.DELETE_DRAFT_RELEASES_ONLY,
      deletePrereleasesOnly: inputs.DELETE_PRERELEASES_ONLY,
      deleteTags: inputs.DELETE_TAGS,
      dryRun: inputs.DRY_RUN,
      excludePattern: inputs.EXCLUDE_PATTERN,
      maxConcurrency: inputs.MAX_CONCURRENCY,
      minReleasesToKeep: inputs.MIN_RELEASES_TO_KEEP,
      octokit,
      releasePattern: inputs.RELEASE_PATTERN,
      releasesToKeep: inputs.RELEASES_TO_KEEP,
      targetBranchPattern: inputs.TARGET_BRANCH_PATTERN
    })
    setSummaryOutputs(summary)
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error))
  }
}

function setSummaryOutputs(summary: RmReleasesSummary): void {
  // Count outputs support simple workflow conditions without requiring users to parse JSON in common cleanup workflows.
  setOutput("matched_count", summary.matchedCount)
  setOutput("kept_count", summary.keptCount)
  setOutput("delete_count", summary.deleteCount)
  setOutput("deleted_count", summary.deletedCount)
  setOutput("deleted_tags_count", summary.deletedTagsCount)
  setOutput("skipped_missing_tags_count", summary.skippedMissingTagsCount)
  // The JSON output preserves exact candidate tags for audit logs and dry-run approvals.
  setOutput("summary_json", JSON.stringify(summary))
}

// noinspection JSIgnoredPromiseFromCall
run()
