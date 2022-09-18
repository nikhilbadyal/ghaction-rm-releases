/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { Release } from '../src/github'
import {
  deleteRelease,
  deleteTag,
  getMyOctokit,
  getReleases,
  rmReleases
} from '../src/github'
import { parse } from 'dotenv'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import fs from 'node:fs'
import { join } from 'node:path'
import { debug } from '@actions/core'
import { context } from '@actions/github'
let octokit
const testTimeout = 10_000
jest.setTimeout(testTimeout)
beforeEach(() => {
  for (const key of Object.keys(process.env)) {
    if (key !== 'GITHUB_TOKEN' && key.startsWith('GITHUB_')) {
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
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
async function createRelease(): Promise<void> {
  const tagName = 'latest-test'
  debug(`Creating release with tag ${tagName}`)
  try {
    await octokit.rest.repos.createRelease({
      ...context.repo,
      tag_name: tagName
    })
  } catch (error) {
    // ignoring as release already exists
  }
}

describe('github', () => {
  it('should getReleases', async function () {
    const release = await getReleases(octokit, '^0.0.1')
    expect(release).not.toBeUndefined()
    expect(release.length).toEqual(1)
  })
  it('should getReleases', async function () {
    const release = await getReleases(octokit, '^0.0.*')
    expect(release).not.toBeUndefined()
    expect(release.length).toEqual(2)
  })
  it('should deleteReleaseAndTag', async function () {
    await createRelease()
    let searchedReleases = await getReleases(octokit, 'latest-*')
    expect(searchedReleases).not.toBeUndefined()
    expect(searchedReleases.length).toEqual(1)
    await rmReleases(octokit, 'latest-*')
    searchedReleases = await getReleases(octokit, 'latest-*')
    expect(searchedReleases).not.toBeUndefined()
    expect(searchedReleases.length).toEqual(0)
    await createRelease()
    await delay(1000)
    debug('Recreating for next run')
    searchedReleases = await getReleases(octokit, 'latest-*')
    expect(searchedReleases).not.toBeUndefined()
    expect(searchedReleases.length).toEqual(1)
  })
  it('throw an error', async () => {
    let invalidOctokit = getMyOctokit('lol_invalid_token', {
      log: console
    })
    await expect(() =>
      getReleases(invalidOctokit, 'latest-*')
    ).rejects.toThrowError()
  })
  it('throw an error', async () => {
    let sampleRelease: Release = {
      id: 12,
      name: 'test',
      tag_name: 'latest',
      body: 'body',
      draft: false,
      prerelease: false
    }
    await expect(() =>
      deleteRelease(octokit, sampleRelease)
    ).rejects.toThrowError()
  })
  it('throw an error', async () => {
    let sampleRelease: Release = {
      id: 12,
      name: 'test',
      tag_name: 'idontexist',
      body: 'body',
      draft: false,
      prerelease: false
    }
    await expect(() => deleteTag(octokit, sampleRelease)).rejects.toThrowError()
  })
  it('print nothing found', async () => {
    await rmReleases(octokit, 'idontexist')
  })
})
