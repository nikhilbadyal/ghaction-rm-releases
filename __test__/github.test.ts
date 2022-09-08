import * as github from '../src/github'
import * as dotenv from 'dotenv'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import fs from 'fs'
import * as path from 'path'
import { debug } from '@actions/core'
let octokit

jest.setTimeout(10000)
beforeEach(() => {
  Object.keys(process.env).forEach(function (key) {
    if (key !== 'GITHUB_TOKEN' && key.startsWith('GITHUB_')) {
      delete process.env[key]
    }
  })
  const repoEnv = dotenv.parse(
    fs.readFileSync(path.join(__dirname, 'fixtures', 'repo.env'))
  )
  for (const k in repoEnv) {
    process.env[k] = repoEnv[k]
  }
  octokit = github.getMyOctokit(process.env.GITHUB_TOKEN || '', {
    log: console
  })
})

describe('github', () => {
  it('should getReleases', async function () {
    let release = await github.getReleases(octokit, '^0.0.1')
    expect(release).not.toBeUndefined()
    expect(release.length).toEqual(1)
  })
  it('should getReleases', async function () {
    let release = await github.getReleases(octokit, '^0.0.*')
    expect(release).not.toBeUndefined()
    expect(release.length).toEqual(2)
  })
})
