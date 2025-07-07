import { getMyOctokit, rmReleases } from "../src/github"
import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { context } from "@actions/github"

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

describe("Target Branch Filtering", () => {
  let mockOctokit: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockOctokit = {
      paginate: jest.fn(),
      rest: {
        git: {
          deleteRef: jest.fn(),
          getRef: jest.fn()
        },
        repos: {
          deleteRelease: jest.fn(),
          getCommit: jest.fn(),
          listReleases: jest.fn()
        }
      }
    }

    const { getOctokit } = require("@actions/github")
    ;(getOctokit as jest.Mock).mockReturnValue(mockOctokit)
  })

  it("should only delete releases from a matching target branch", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release 1",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        created_at: "2024-01-02T00:00:00Z",
        draft: false,
        id: 2,
        name: "Release 2",
        prerelease: false,
        tag_name: "v1.0.1"
      },
      {
        created_at: "2024-01-03T00:00:00Z",
        draft: false,
        id: 3,
        name: "Release 3",
        prerelease: false,
        tag_name: "v1.0.2"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    mockOctokit.rest.git.getRef.mockImplementation(async ({ ref }) => {
      if (ref === "tags/v1.0.0") return { data: { object: { sha: "sha1" } } }
      if (ref === "tags/v1.0.1") return { data: { object: { sha: "sha2" } } }
      if (ref === "tags/v1.0.2") return { data: { object: { sha: "sha3" } } }
      return {}
    })

    mockOctokit.rest.repos.getCommit.mockImplementation(async ({ ref }) => {
      if (ref === "sha1") {
        return {
          data: { html_url: "https://github.com/owner/repo/tree/main/commit1" }
        }
      }
      if (ref === "sha2") {
        return {
          data: {
            html_url: "https://github.com/owner/repo/tree/feature/commit2"
          }
        }
      }
      if (ref === "sha3") {
        return {
          data: { html_url: "https://github.com/owner/repo/tree/main/commit3" }
        }
      }
      return {}
    })

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^main$"
    })

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(2)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 1
    })
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 3
    })
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalledWith({
      ...context.repo,
      release_id: 2
    })
  })

  it("should not filter by target branch when targetBranchPattern is empty", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release 1",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        created_at: "2024-01-02T00:00:00Z",
        draft: false,
        id: 2,
        name: "Release 2",
        prerelease: false,
        tag_name: "v1.0.1"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    mockOctokit.rest.git.getRef.mockImplementation(async ({ ref }) => {
      if (ref === "tags/v1.0.0") return { data: { object: { sha: "sha1" } } }
      if (ref === "tags/v1.0.1") return { data: { object: { sha: "sha2" } } }
      return {}
    })

    mockOctokit.rest.repos.getCommit.mockImplementation(async ({ ref }) => {
      if (ref === "sha1") {
        return {
          data: { html_url: "https://github.com/owner/repo/tree/main/commit1" }
        }
      }
      if (ref === "sha2") {
        return {
          data: {
            html_url: "https://github.com/owner/repo/tree/feature/commit2"
          }
        }
      }
      return {}
    })

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "" // Default behavior
    })

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(2)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 1
    })
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 2
    })
  })

  it("should combine target branch filtering with other filters", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release 1",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        created_at: "2024-01-02T00:00:00Z",
        draft: true,
        id: 2,
        name: "Release 2",
        // Draft release
        prerelease: false,

        tag_name: "v1.0.1"
      },
      {
        // Prerelease
        created_at: "2024-01-03T00:00:00Z",

        draft: false,

        id: 3,

        name: "Release 3",

        prerelease: true,
        tag_name: "v1.0.2-beta"
      },
      {
        created_at: "2024-01-04T00:00:00Z",
        draft: false,
        id: 4,
        name: "Release 4",
        prerelease: false,
        tag_name: "v2.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    mockOctokit.rest.git.getRef.mockImplementation(async ({ ref }) => {
      if (ref === "tags/v1.0.0") return { data: { object: { sha: "sha1" } } }
      if (ref === "tags/v1.0.1") return { data: { object: { sha: "sha2" } } }
      if (ref === "tags/v1.0.2-beta") {
        return { data: { object: { sha: "sha3" } } }
      }
      if (ref === "tags/v2.0.0") return { data: { object: { sha: "sha4" } } }
      return {}
    })

    mockOctokit.rest.repos.getCommit.mockImplementation(async ({ ref }) => {
      if (ref === "sha1") {
        return {
          data: { html_url: "https://github.com/owner/repo/tree/main/commit1" }
        }
      }
      if (ref === "sha2") {
        return {
          data: {
            html_url: "https://github.com/owner/repo/tree/feature/commit2"
          }
        }
      }
      if (ref === "sha3") {
        return {
          data: { html_url: "https://github.com/owner/repo/tree/main/commit3" }
        }
      }
      if (ref === "sha4") {
        return {
          data: {
            html_url: "https://github.com/owner/repo/tree/develop/commit4"
          }
        }
      }
      return {}
    })

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      // Only consider v1 releases
      deleteDraftReleasesOnly: true,

      octokit,
      releasePattern: "^v1.*",
      // Only consider 'main' branch
      releasesToKeep: 0,
      // Only consider drafts
      targetBranchPattern: "^main$"
    })

    // Expected: Only Release 1 (v1.0.0, draft:false, main branch) and Release 3 (v1.0.2-beta, prerelease:true, main branch)
    // Filtered by releasePattern: Release 1, Release 2, Release 3
    // Filtered by deleteDraftReleasesOnly: Release 2 (draft)
    // Filtered by targetBranchPattern: Release 1, Release 3 (main branch)

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(0) // No deletions if all are kept or none match criteria
  })

  it("should handle errors when fetching commit details for a release", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release 1",
        prerelease: false,
        tag_name: "v1.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    // Mock getRef to throw an error
    mockOctokit.rest.git.getRef.mockRejectedValue(
      new Error("Failed to get ref")
    )

    // Spy on info to check if the error message is logged
    const infoSpy = jest.spyOn(require("@actions/core"), "info")

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^main$"
    })

    expect(infoSpy).toHaveBeenCalledWith(
      "Could not fetch commit for release v1.0.0: Failed to get ref"
    )
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(0) // No deletion as it couldn't be processed
  })

  it("should handle releases with no discernible target branch", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release 1",
        prerelease: false,
        tag_name: "v1.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    mockOctokit.rest.git.getRef.mockResolvedValue({
      data: { object: { sha: "sha1" } }
    })

    // Mock getCommit to return a URL without "/tree/"
    mockOctokit.rest.repos.getCommit.mockResolvedValue({
      data: { html_url: "https://github.com/owner/repo/commit/sha1" }
    })

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^main$" // Pattern that won't match an empty branchName
    })

    // No releases should be deleted because the branchName will be empty and won't match "^main$"
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(0)
  })

  it("should handle releases where the branch name segment is an empty string", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release 1",
        prerelease: false,
        tag_name: "v1.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    mockOctokit.rest.git.getRef.mockResolvedValue({
      data: { object: { sha: "sha1" } }
    })

    // Mock getCommit to return a URL with "/tree/" but an empty string after it
    mockOctokit.rest.repos.getCommit.mockResolvedValue({
      data: { html_url: "https://github.com/owner/repo/tree//commit1" }
    })

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^main$" // Pattern that won't match an empty branchName
    })

    // No releases should be deleted because the branchName will be empty and won't match "^main$"
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(0)
  })

  it("should handle releases where the branch name segment is an empty string (due to // in URL)", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release 1",
        prerelease: false,
        tag_name: "v1.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    mockOctokit.rest.git.getRef.mockResolvedValue({
      data: { object: { sha: "sha1" } }
    })

    // Mock getCommit to return a URL with "/tree/" but an empty string after it
    mockOctokit.rest.repos.getCommit.mockResolvedValue({
      data: { html_url: "https://github.com/owner/repo/tree//commit1" }
    })

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^main$" // Pattern that won't match an empty branchName
    })

    // No releases should be deleted because the branchName will be empty and won't match "^main$"
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(0)
  })

  it("should handle errors when fetching commit details for a release and getCommit fails", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release 1",
        prerelease: false,
        tag_name: "v1.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    // Mock getRef to succeed
    mockOctokit.rest.git.getRef.mockResolvedValue({
      data: { object: { sha: "sha1" } }
    })

    // Mock getCommit to throw an error
    mockOctokit.rest.repos.getCommit.mockRejectedValue(
      new Error("Failed to get commit")
    )

    // Spy on info to check if the error message is logged
    const infoSpy = jest.spyOn(require("@actions/core"), "info")

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^main$"
    })

    expect(infoSpy).toHaveBeenCalledWith(
      "Could not fetch commit for release v1.0.0: Failed to get commit"
    )
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(0) // No deletion as it couldn't be processed
  })

  it("should handle non-Error objects when fetching commit details for a release fails", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release 1",
        prerelease: false,
        tag_name: "v1.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    // Mock getRef to succeed
    mockOctokit.rest.git.getRef.mockResolvedValue({
      data: { object: { sha: "sha1" } }
    })

    // Mock getCommit to throw a non-Error object (string)
    mockOctokit.rest.repos.getCommit.mockRejectedValue("Network timeout")

    // Spy on info to check if the error message is logged
    const infoSpy = jest.spyOn(require("@actions/core"), "info")

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^main$"
    })

    expect(infoSpy).toHaveBeenCalledWith(
      "Could not fetch commit for release v1.0.0: Network timeout"
    )
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(0) // No deletion as it couldn't be processed
  })
})
