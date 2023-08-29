/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { Release } from '../src/github'
import {
  deleteRelease,
  deleteTag,
  getMyOctokit,
  rmReleases
} from '../src/github'
import { parse } from 'dotenv'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import fs from 'node:fs'
import { join } from 'node:path'
let octokit
const testTimeout = 30_000
jest.setTimeout(testTimeout)
describe('wrong tags and releases', () => {
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
  it('throw an error on wrong release', async () => {
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
  it('throw an error on wrong tag', async () => {
    let sampleRelease: Release = {
      id: 12,
      name: 'test',
      tag_name: 'idontexist',
      body: 'body',
      draft: false,
      prerelease: false
    }
    await expect(() =>
      deleteTag(octokit, sampleRelease.tag_name)
    ).rejects.toThrowError()
  })
  it('print nothing found', async () => {
    await rmReleases(octokit, 'idontexist')
  })
})
