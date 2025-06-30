/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { Release } from '../src/github'
import {
  deleteRelease,
  deleteTag,
  getMyOctokit,
  rmReleases
} from '../src/github'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'

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

describe('wrong tags and releases', () => {
  let mockOctokit: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock octokit instance
    mockOctokit = {
      rest: {
        repos: {
          listReleases: jest.fn(),
          deleteRelease: jest.fn()
        },
        git: {
          deleteRef: jest.fn()
        }
      },
      paginate: jest.fn()
    }

    // Mock the getOctokit function to return our mock
    const { getOctokit } = require('@actions/github')
    ;(getOctokit as jest.Mock).mockReturnValue(mockOctokit)
  })

  it('throw an error on wrong release', async () => {
    const sampleRelease: Release = {
      id: 12,
      name: 'test',
      tag_name: 'latest',
      body: 'body',
      draft: false,
      prerelease: false
    }

    const octokit = getMyOctokit('mock-token')

    // Mock API error for non-existent release
    mockOctokit.rest.repos.deleteRelease.mockRejectedValue(
      new Error('Not Found')
    )

    await expect(deleteRelease(octokit, sampleRelease)).rejects.toThrow(
      'Unable to release tag 12: Error: Not Found'
    )

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: 'nikhilbadyal',
      repo: 'test-repo',
      release_id: 12
    })
  })

  it('throw an error on wrong tag', async () => {
    const sampleRelease: Release = {
      id: 12,
      name: 'test',
      tag_name: 'idontexist',
      body: 'body',
      draft: false,
      prerelease: false
    }

    const octokit = getMyOctokit('mock-token')

    // Mock API error for non-existent tag
    mockOctokit.rest.git.deleteRef.mockRejectedValue(
      new Error('Reference does not exist')
    )

    await expect(deleteTag(octokit, sampleRelease.tag_name)).rejects.toThrow(
      'Unable to delete tag idontexist: Error: Reference does not exist'
    )

    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledWith({
      owner: 'nikhilbadyal',
      repo: 'test-repo',
      ref: 'tags/idontexist'
    })
  })

  it('print nothing found when no releases match pattern', async () => {
    const octokit = getMyOctokit('mock-token')

    // Mock empty response for non-matching pattern
    mockOctokit.paginate.mockResolvedValue([])

    // This should complete without errors
    await rmReleases(octokit, 'idontexist')

    expect(mockOctokit.paginate).toHaveBeenCalledWith(
      mockOctokit.rest.repos.listReleases,
      {
        owner: 'nikhilbadyal',
        repo: 'test-repo'
      }
    )

    // Verify no deletion calls were made since no releases were found
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
    expect(mockOctokit.rest.git.deleteRef).not.toHaveBeenCalled()
  })

  it('should handle authentication errors', async () => {
    const octokit = getMyOctokit('mock-token')

    // Mock authentication error
    mockOctokit.paginate.mockRejectedValue(new Error('Bad credentials'))

    await expect(rmReleases(octokit, 'some-pattern')).rejects.toThrow(
      'Unable to list release: Error: Bad credentials'
    )
  })

  it('should handle rate limiting errors', async () => {
    const sampleRelease: Release = {
      id: 123,
      name: 'test',
      tag_name: 'v1.0.0',
      body: 'body',
      draft: false,
      prerelease: false
    }

    const octokit = getMyOctokit('mock-token')

    // Mock rate limiting error
    mockOctokit.rest.repos.deleteRelease.mockRejectedValue(
      new Error('API rate limit exceeded')
    )

    await expect(deleteRelease(octokit, sampleRelease)).rejects.toThrow(
      'Unable to release tag 123: Error: API rate limit exceeded'
    )
  })
})
