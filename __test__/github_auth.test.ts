/* eslint-disable @typescript-eslint/no-magic-numbers */
import {
  getMyOctokit,
  getReleases} from '../src/github'
import { describe, expect, it, jest } from '@jest/globals'
const testTimeout = 30_000
jest.setTimeout(testTimeout)

describe('auth tests', () => {
  it('throw an error for invalid token', async () => {
    let invalidOctokit = getMyOctokit('lol_invalid_token', {
      log: console
    })
    await expect(() =>
      getReleases(invalidOctokit, 'latest-*')
    ).rejects.toThrowError()
  })
  it('failed on empty token', async () => {
    await expect(() =>
      getMyOctokit('', {
        log: console
      })
    ).toThrowError()
  })
})
