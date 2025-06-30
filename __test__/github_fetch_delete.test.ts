/* eslint-disable @typescript-eslint/no-magic-numbers */
import {
  getMyOctokit,
  getReleases,
  rmReleases,
  deleteRelease,
  deleteTag
} from '../src/github'
import { parse } from 'dotenv'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import fs from 'node:fs'
import { join } from 'node:path'
import { info } from '@actions/core'
import { context } from '@actions/github'

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

describe('fetch & delete tests', () => {
  let mockOctokit: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock octokit instance
    mockOctokit = {
      rest: {
        repos: {
          listReleases: jest.fn(),
          deleteRelease: jest.fn(),
          createRelease: jest.fn()
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

  it('should delete release and tag', async function () {
    const testTagName = 'test-tag-v1.0.0'

    // Mock the initial getReleases call to return the release we want to delete
    const mockReleases = [
      {
        id: 123,
        tag_name: testTagName,
        name: testTagName,
        body: 'Test release',
        draft: false,
        prerelease: false
      }
    ]

    // First call to getReleases returns the release
    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    // Mock successful deletion calls
    mockOctokit.rest.repos.deleteRelease.mockResolvedValueOnce(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValueOnce(undefined)
    // Second call to getReleases returns empty array (release deleted)
    mockOctokit.paginate.mockResolvedValueOnce([])

    const octokit = getMyOctokit('mock-token')

    // Verify release exists initially
    let searchedReleases = await getReleases(octokit, testTagName)
    expect(searchedReleases).not.toBeUndefined()
    expect(searchedReleases.length).toEqual(1)

    // Delete the releases
    await rmReleases(octokit, testTagName)

    // Verify deletion API calls were made
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: 'nikhilbadyal',
      repo: 'test-repo',
      release_id: 123
    })
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledWith({
      owner: 'nikhilbadyal',
      repo: 'test-repo',
      ref: `tags/${testTagName}`
    })

    // Verify release no longer exists
    searchedReleases = await getReleases(octokit, testTagName)
    expect(searchedReleases).not.toBeUndefined()
    expect(searchedReleases.length).toEqual(0)
  })

  it('should handle multiple releases deletion', async function () {
    const mockReleases = [
      {
        id: 1,
        tag_name: 'v0.0.1',
        name: 'Release v0.0.1',
        body: 'Test release 1',
        draft: false,
        prerelease: false
      },
      {
        id: 2,
        tag_name: 'v0.0.2',
        name: 'Release v0.0.2',
        body: 'Test release 2',
        draft: false,
        prerelease: false
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit('mock-token')
    await rmReleases(octokit, '^v0.0.*')

    // Verify both releases were deleted
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(2)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(2)

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: 'nikhilbadyal',
      repo: 'test-repo',
      release_id: 1
    })
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: 'nikhilbadyal',
      repo: 'test-repo',
      release_id: 2
    })
  })

  it('should handle deletion errors gracefully', async function () {
    const mockRelease = {
      id: 999,
      tag_name: 'nonexistent-tag',
      name: 'Nonexistent Release',
      body: '',
      draft: false,
      prerelease: false
    }

    const octokit = getMyOctokit('mock-token')

    // Mock deletion failure
    mockOctokit.rest.repos.deleteRelease.mockRejectedValue(
      new Error('Release not found')
    )

    await expect(deleteRelease(octokit, mockRelease)).rejects.toThrow(
      'Unable to release tag 999: Error: Release not found'
    )
  })

  it('should handle tag deletion errors gracefully', async function () {
    const octokit = getMyOctokit('mock-token')

    // Mock tag deletion failure
    mockOctokit.rest.git.deleteRef.mockRejectedValue(
      new Error('Reference does not exist')
    )

    await expect(deleteTag(octokit, 'nonexistent-tag')).rejects.toThrow(
      'Unable to delete tag nonexistent-tag: Error: Reference does not exist'
    )
  })

  it('should handle no releases found scenario', async function () {
    // Mock empty releases response
    mockOctokit.paginate.mockResolvedValue([])

    const octokit = getMyOctokit('mock-token')
    await rmReleases(octokit, 'nonexistent-pattern')

    // Verify no deletion calls were made
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
    expect(mockOctokit.rest.git.deleteRef).not.toHaveBeenCalled()
  })
})
