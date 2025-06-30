/* eslint-disable @typescript-eslint/no-magic-numbers */
import { getMyOctokit, getReleases, type Release } from '../src/github'
import { describe, expect, it, jest, beforeEach } from '@jest/globals'

// Mock @actions/github
jest.mock('@actions/github', () => ({
  getOctokit: jest.fn(),
  context: {
    repo: {
      owner: 'nikhilbadyal',
      repo: 'test-repo'
    }
  }
}))

// Mock @actions/core
jest.mock('@actions/core', () => ({
  info: jest.fn(),
  setFailed: jest.fn()
}))

const testTimeout = 30_000
jest.setTimeout(testTimeout)

describe('auth tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throw an error for invalid token', async () => {
    // Create mock octokit that simulates invalid token behavior
    const mockInvalidOctokit: any = {
        rest: {
          repos: {
            listReleases: jest.fn()
          }
        },
        paginate: jest.fn()
      }



      // Mock the paginate to reject with authentication error
    mockInvalidOctokit.paginate.mockRejectedValue(new Error('Bad credentials'))

    const { getOctokit } = require('@actions/github')
    ;(getOctokit as jest.Mock).mockReturnValue(mockInvalidOctokit)

    const invalidOctokit = getMyOctokit('lol_invalid_token', {
      log: console
    })

    await expect(getReleases(invalidOctokit, 'bs')).rejects.toThrow(
      'Unable to list release: Error: Bad credentials'
    )
  })

  it('failed on empty token', async () => {
    expect(() =>
      getMyOctokit('', {
        log: console
      })
    ).toThrow('Need Github Token')
  })

  it('should create octokit instance with valid token', async () => {
    // Give explicit type signature to your mock:
    const paginateMock = jest.fn().mockResolvedValue([] as Release[])

    const mockValidOctokit: any = {
      rest: {
        repos: {
          listReleases: jest.fn()
        }
      },
      paginate: paginateMock
    };

    const { getOctokit } = require('@actions/github')
    ;(getOctokit as jest.Mock).mockReturnValue(mockValidOctokit)

    const validOctokit = getMyOctokit('valid_token', {
      log: console
    })

    expect(validOctokit).toBeDefined()
    expect(getOctokit).toHaveBeenCalledWith('valid_token', { log: console })

    // Test that a valid token can make successful API calls
    const releases = await getReleases(validOctokit, 'some-pattern')
    expect(releases).toEqual([])
  });
})
