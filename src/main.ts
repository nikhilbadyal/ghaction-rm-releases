import { debug, setFailed } from '@actions/core'
import type { ActionInputs } from './utils'
import { getMyOctokit, rmReleases } from './github'
import { getInputs } from './utils'

let octokit
let inputs: ActionInputs

function setupGitHub(): void {
  debug('Getting gitHub Token')
  octokit = getMyOctokit(inputs.github_token)
}

function setUp(): void {
  inputs = getInputs()
  setupGitHub()
}
async function run(): Promise<void> {
  try {
    setUp()
    await rmReleases(octokit, inputs.release_pattern)
  } catch (error) {
    if (error instanceof Error) setFailed(error.message)
  }
}
// eslint-disable-next-line capitalized-comments
// noinspection JSIgnoredPromiseFromCall
run()
