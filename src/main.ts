import { info, setFailed } from '@actions/core'
import { getMyOctokit, rmReleases } from './github'
import { getInputs, type ActionInputs } from './utils'
import type { GitHub } from '@actions/github/lib/utils'

let octokit: InstanceType<typeof GitHub>
let inputs: ActionInputs

function setupGitHub(): void {
  info('Getting gitHub Token')
  octokit = getMyOctokit(inputs.GITHUB_TOKEN)
}

function setUp(): void {
  inputs = getInputs()
  setupGitHub()
}
async function run(): Promise<void> {
  try {
    setUp()
    await rmReleases(octokit, inputs.RELEASE_PATTERN)
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message)
    }
  }
}

// noinspection JSIgnoredPromiseFromCall
run()
