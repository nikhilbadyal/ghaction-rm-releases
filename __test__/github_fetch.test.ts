/* eslint-disable @typescript-eslint/no-magic-numbers */
import {
  getMyOctokit,
  getReleases} from '../src/github'
import { parse } from 'dotenv'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import fs from 'node:fs'
import { join } from 'node:path'
import { info } from '@actions/core'
import { context } from '@actions/github'
let octokit
const testTimeout = 30_000
jest.setTimeout(testTimeout)
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
async function createRelease(tagName: string = ''): Promise<string> {
  if (tagName == '') {
    tagName = 'latest-tag' + process.env['GITHUB_RUN_ID']
    info(`Creating release ${tagName}`)
  }
  try {
    await octokit.rest.repos.createRelease({
      ...context.repo,
      tag_name: tagName,
      name: tagName
    })
  } catch (error) {
    // ignoring as release already exists
    info(`Failed to create release ${error}`)
  }
  return tagName
}

describe('fetching test cases', () => {
  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (
        key !== 'GITHUB_TOKEN' &&
        key != 'GITHUB_RUN_ID' &&
        key.startsWith('GITHUB_')
      ) {
        delete process.env[key]
      }
    }
    const repoEnvironment = parse(
      fs.readFileSync(join(__dirname, 'fixtures', 'repo.env'))
    )
    for (const environment in repoEnvironment) {
      process.env[environment] = repoEnvironment[environment]
    }
    octokit = getMyOctokit(process.env.GITHUB_TOKEN ?? '', {
      log: console
    })
  })
  it('should getReleases exact version', async function () {
    const release = await getReleases(octokit, '^v0.0.1')
    expect(release).not.toBeUndefined()
    expect(release.length).toEqual(1)
  })
  it('should getReleases with wildcard', async function () {
    const release = await getReleases(octokit, '^v0.0.*')
    expect(release).not.toBeUndefined()
    expect(release.length).toEqual(2)
  })
})
