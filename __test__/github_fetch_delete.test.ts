/* eslint-disable @typescript-eslint/no-magic-numbers */
import { getMyOctokit, getReleases, rmReleases } from '../src/github'
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

describe('fetch & delete tests', () => {
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
  it('should-deleteReleaseAndTag', async function () {
    let tag_name = await createRelease()
    await delay(10000)
    let searchedReleases = await getReleases(octokit, tag_name)
    expect(searchedReleases).not.toBeUndefined()
    expect(searchedReleases.length).toEqual(1)
    await rmReleases(octokit, tag_name, '^v0.0.*')
    searchedReleases = await getReleases(octokit, tag_name)
    expect(searchedReleases).not.toBeUndefined()
    expect(searchedReleases.length).toEqual(0)
  })
})
