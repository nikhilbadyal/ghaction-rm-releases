import {
  getMyOctokit,
  getReleases,
  rmReleases,
  deleteRelease,
  deleteTag
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

describe("fetch & delete tests", () => {
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
          createRelease: jest.fn(),
          deleteRelease: jest.fn(),
          listReleases: jest.fn()
        }
      }
    }

    // Mock the getOctokit function to return our mock
    const { getOctokit } = require("@actions/github")
    ;(getOctokit as jest.Mock).mockReturnValue(mockOctokit)
  })

  it("should delete release and tag", async function () {
    const testTagName = "test-tag-v1.0.0"

    // Mock the initial getReleases call to return the release we want to delete
    const mockReleases = [
      {
        body: "Test release",
        created_at: "2023-01-01T00:00:00Z",
        draft: false,
        id: 123,
        name: testTagName,
        prerelease: false,
        tag_name: testTagName
      }
    ]

    // First call to getReleases returns the release (for initial verification)
    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    // Second call to getReleases returns the release (inside rmReleases)
    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    // Mock successful deletion calls
    mockOctokit.rest.repos.deleteRelease.mockResolvedValueOnce(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValueOnce(undefined)
    // Third call to getReleases returns empty array (release deleted)
    mockOctokit.paginate.mockResolvedValueOnce([])

    const octokit = getMyOctokit("mock-token")

    // Verify release exists initially
    let searchedReleases = await getReleases(octokit, testTagName)
    expect(searchedReleases).not.toBeUndefined()
    expect(searchedReleases.length).toEqual(1)

    // Delete the releases
    await rmReleases(octokit, testTagName, 0)

    // Verify deletion API calls were made
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      release_id: 123,
      repo: "test-repo"
    })
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      ref: `tags/${testTagName}`,
      repo: "test-repo"
    })

    // Verify release no longer exists
    searchedReleases = await getReleases(octokit, testTagName)
    expect(searchedReleases).not.toBeUndefined()
    expect(searchedReleases.length).toEqual(0)
  })

  it("should handle multiple releases deletion", async function () {
    const mockReleases = [
      {
        body: "Test release 1",
        created_at: "2023-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release v0.0.1",
        prerelease: false,
        tag_name: "v0.0.1"
      },
      {
        body: "Test release 2",
        created_at: "2023-01-02T00:00:00Z",
        draft: false,
        id: 2,
        name: "Release v0.0.2",
        prerelease: false,
        tag_name: "v0.0.2"
      }
    ]

    // Mock getReleases call inside rmReleases to return the releases
    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    await rmReleases(octokit, "^v0.0.*", 0)

    // Verify both releases were deleted
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(2)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(2)

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      release_id: 1,
      repo: "test-repo"
    })
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      release_id: 2,
      repo: "test-repo"
    })
  })

  it("should handle deletion errors gracefully", async function () {
    const mockRelease = {
      body: "",
      created_at: "2023-01-01T00:00:00Z",
      draft: false,
      id: 999,
      name: "Nonexistent Release",
      prerelease: false,
      tag_name: "nonexistent-tag"
    }

    const octokit = getMyOctokit("mock-token")

    // Mock deletion failure
    mockOctokit.rest.repos.deleteRelease.mockRejectedValue(
      new Error("Release not found")
    )

    await expect(deleteRelease(octokit, mockRelease)).rejects.toThrow(
      "Unable to delete release 999: Release not found"
    )
  })

  it("should handle tag deletion errors gracefully", async function () {
    const octokit = getMyOctokit("mock-token")

    // Mock tag deletion failure
    mockOctokit.rest.git.deleteRef.mockRejectedValue(
      new Error("Reference does not exist")
    )

    await expect(deleteTag(octokit, "nonexistent-tag")).rejects.toThrow(
      "Unable to delete tag nonexistent-tag: Reference does not exist"
    )
  })

  it("should handle no releases found scenario", async function () {
    // Mock empty releases response
    mockOctokit.paginate.mockResolvedValue([])

    const octokit = getMyOctokit("mock-token")
    await rmReleases(octokit, "nonexistent-pattern", 0)

    // Verify no deletion calls were made
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
    expect(mockOctokit.rest.git.deleteRef).not.toHaveBeenCalled()
  })

  it("should keep the specified number of most recent releases", async function () {
    const mockReleases = [
      {
        body: "Test release 1",
        created_at: "2023-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release v0.0.1",
        prerelease: false,
        tag_name: "v0.0.1"
      },
      {
        body: "Test release 2",
        created_at: "2023-01-02T00:00:00Z",
        draft: false,
        id: 2,
        name: "Release v0.0.2",
        prerelease: false,
        tag_name: "v0.0.2"
      },
      {
        body: "Test release 3",
        created_at: "2023-01-03T00:00:00Z",
        draft: false,
        id: 3,
        name: "Release v0.0.3",
        prerelease: false,
        tag_name: "v0.0.3"
      }
    ]

    // Mock getReleases call inside rmReleases to return the releases
    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    // Keep 2 most recent releases (v0.0.3 and v0.0.2), delete v0.0.1
    await rmReleases(octokit, "^v0.0.*", 2)

    // Verify only the oldest release was deleted
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(1)

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      release_id: 1,
      repo: "test-repo"
    })
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      ref: "tags/v0.0.1",
      repo: "test-repo"
    })
  })

  it("should delete all releases if RELEASES_TO_KEEP is 0", async function () {
    const mockReleases = [
      {
        body: "Test release 1",
        created_at: "2023-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release v0.0.1",
        prerelease: false,
        tag_name: "v0.0.1"
      },
      {
        body: "Test release 2",
        created_at: "2023-01-02T00:00:00Z",
        draft: false,
        id: 2,
        name: "Release v0.0.2",
        prerelease: false,
        tag_name: "v0.0.2"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    await rmReleases(octokit, "^v0.0.*", 0)

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(2)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(2)
  })

  it("should not delete any releases if RELEASES_TO_KEEP is greater than or equal to matching releases", async function () {
    const mockReleases = [
      {
        body: "Test release 1",
        created_at: "2023-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release v0.0.1",
        prerelease: false,
        tag_name: "v0.0.1"
      },
      {
        body: "Test release 2",
        created_at: "2023-01-02T00:00:00Z",
        draft: false,
        id: 2,
        name: "Release v0.0.2",
        prerelease: false,
        tag_name: "v0.0.2"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)

    const octokit = getMyOctokit("mock-token")
    await rmReleases(octokit, "^v0.0.*", 5) // Keep 5, but only 2 exist

    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
    expect(mockOctokit.rest.git.deleteRef).not.toHaveBeenCalled()
  })

  it("should handle RELEASES_TO_KEEP equal to number of releases", async function () {
    const mockReleases = [
      {
        body: "Test release 1",
        created_at: "2023-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release v0.0.1",
        prerelease: false,
        tag_name: "v0.0.1"
      },
      {
        body: "Test release 2",
        created_at: "2023-01-02T00:00:00Z",
        draft: false,
        id: 2,
        name: "Release v0.0.2",
        prerelease: false,
        tag_name: "v0.0.2"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)

    const octokit = getMyOctokit("mock-token")
    await rmReleases(octokit, "^v0.0.*", 2) // Keep exactly 2, and 2 exist

    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
    expect(mockOctokit.rest.git.deleteRef).not.toHaveBeenCalled()
  })
})
