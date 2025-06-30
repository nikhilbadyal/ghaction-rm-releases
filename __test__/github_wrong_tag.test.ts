import type { Release } from "../src/github"
import {
  deleteRelease,
  deleteTag,
  getMyOctokit,
  rmReleases
} from "../src/github"
import { beforeEach, describe, expect, it, jest } from "@jest/globals"

// Mock @actions/github
jest.mock("@actions/github", () => ({
  context: {
    repo: {
      owner: "nikhilbadyal",
      repo: "test-repo"
    }
  },
  getOctokit: jest.fn()
}))

// Mock @actions/core
jest.mock("@actions/core", () => ({
  info: jest.fn(),
  setFailed: jest.fn()
}))

const testTimeout = 30_000
jest.setTimeout(testTimeout)

describe("wrong tags and releases", () => {
  let mockOctokit: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock octokit instance
    mockOctokit = {
      paginate: jest.fn(),
      rest: {
        git: {
          deleteRef: jest.fn()
        },
        repos: {
          deleteRelease: jest.fn(),
          listReleases: jest.fn()
        }
      }
    }

    // Mock the getOctokit function to return our mock
    const { getOctokit } = require("@actions/github")
    ;(getOctokit as jest.Mock).mockReturnValue(mockOctokit)
  })

  it("throw an error on wrong release", async () => {
    const sampleRelease: Release = {
      body: "body",
      created_at: "2023-01-01T00:00:00Z",
      draft: false,
      id: 12,
      name: "test",
      prerelease: false,
      tag_name: "latest"
    }

    const octokit = getMyOctokit("mock-token")

    // Mock API error for non-existent release
    mockOctokit.rest.repos.deleteRelease.mockRejectedValue(
      new Error("Not Found")
    )

    await expect(deleteRelease(octokit, sampleRelease)).rejects.toThrow(
      "Unable to delete release 12: Not Found"
    )

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      release_id: 12,
      repo: "test-repo"
    })
  })

  it("throw an error on wrong tag", async () => {
    const sampleRelease: Release = {
      body: "body",
      created_at: "2023-01-01T00:00:00Z",
      draft: false,
      id: 12,
      name: "test",
      prerelease: false,
      tag_name: "idontexist"
    }

    const octokit = getMyOctokit("mock-token")

    // Mock API error for non-existent tag
    mockOctokit.rest.git.deleteRef.mockRejectedValue(
      new Error("Reference does not exist")
    )

    await expect(deleteTag(octokit, sampleRelease.tag_name)).rejects.toThrow(
      "Unable to delete tag idontexist: Reference does not exist"
    )

    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      ref: "tags/idontexist",
      repo: "test-repo"
    })
  })

  it("print nothing found when no releases match pattern", async () => {
    const octokit = getMyOctokit("mock-token")

    // Mock empty response for non-matching pattern
    mockOctokit.paginate.mockResolvedValue([])

    // This should complete without errors
    await rmReleases(octokit, "idontexist", 0)

    expect(mockOctokit.paginate).toHaveBeenCalledWith(
      mockOctokit.rest.repos.listReleases,
      {
        owner: "nikhilbadyal",
        repo: "test-repo"
      }
    )

    // Verify no deletion calls were made since no releases were found
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
    expect(mockOctokit.rest.git.deleteRef).not.toHaveBeenCalled()
  })

  it("should handle authentication errors", async () => {
    const octokit = getMyOctokit("mock-token")

    // Mock authentication error
    mockOctokit.paginate.mockRejectedValue(new Error("Bad credentials"))

    await expect(rmReleases(octokit, "some-pattern", 0)).rejects.toThrow(
      "Unable to list release: Bad credentials"
    )
  })

  it("should handle rate limiting errors", async () => {
    const sampleRelease: Release = {
      body: "body",
      created_at: "2023-01-01T00:00:00Z",
      draft: false,
      id: 123,
      name: "test",
      prerelease: false,
      tag_name: "v1.0.0"
    }

    const octokit = getMyOctokit("mock-token")

    // Mock rate limiting error
    mockOctokit.rest.repos.deleteRelease.mockRejectedValue(
      new Error("API rate limit exceeded")
    )

    await expect(deleteRelease(octokit, sampleRelease)).rejects.toThrow(
      "Unable to delete release 123: API rate limit exceeded"
    )
  })

  it("should handle non-Error object in deleteRelease catch", async () => {
    const sampleRelease: Release = {
      body: "body",
      created_at: "2023-01-01T00:00:00Z",
      draft: false,
      id: 456,
      name: "test",
      prerelease: false,
      tag_name: "v2.0.0"
    }

    const octokit = getMyOctokit("mock-token")

    // Mock rejection with a string
    mockOctokit.rest.repos.deleteRelease.mockRejectedValue(
      "Something went wrong"
    )

    await expect(deleteRelease(octokit, sampleRelease)).rejects.toThrow(
      "Unable to delete release 456: Something went wrong"
    )
  })

  it("should handle non-Error object in deleteTag catch", async () => {
    const octokit = getMyOctokit("mock-token")

    // Mock rejection with a string
    mockOctokit.rest.git.deleteRef.mockRejectedValue("Tag not found")

    await expect(deleteTag(octokit, "nonexistent-tag-string")).rejects.toThrow(
      "Unable to delete tag nonexistent-tag-string: Tag not found"
    )
  })
})
