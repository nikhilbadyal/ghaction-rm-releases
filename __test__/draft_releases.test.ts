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

describe("Draft Releases Deletion", () => {
  let mockOctokit: any

  beforeEach(() => {
    jest.clearAllMocks()

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

    const { getOctokit } = require("@actions/github")
    ;(getOctokit as jest.Mock).mockReturnValue(mockOctokit)
  })

  it("should only delete draft releases when deleteDraftReleases is true", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: true,
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
        draft: true,
        id: 3,
        name: "Release 3",
        prerelease: false,
        tag_name: "v1.0.2-draft"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      deleteDraftReleasesOnly: true,
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0
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

  it("should not filter by draft status when deleteDraftReleases is false", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: true,
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
        draft: true,
        id: 3,
        name: "Release 3",
        prerelease: false,
        tag_name: "v1.0.2-draft"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      deleteDraftReleasesOnly: false,
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0 // Default behavior
    })

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(3)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 1
    })
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 2
    })
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 3
    })
  })

  it("should respect releasesToKeep when deleting draft releases", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: true,
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
        prerelease: false,
        tag_name: "v1.0.1"
      },
      {
        created_at: "2024-01-03T00:00:00Z",
        draft: true,
        id: 3,
        name: "Release 3",
        prerelease: false,
        tag_name: "v1.0.2-draft"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      // Keep the most recent draft release
      deleteDraftReleasesOnly: true,

      octokit,

      releasePattern: ".*",
      releasesToKeep: 1
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
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalledWith({
      ...context.repo,
      release_id: 3
    }) // Release 3 should be kept
  })

  it("should respect daysToKeep when deleting draft releases", async () => {
    const now = new Date()
    const twoDaysAgo = new Date(
      now.getTime() - 2 * 24 * 60 * 60 * 1000
    ).toISOString()
    const fiveDaysAgo = new Date(
      now.getTime() - 5 * 24 * 60 * 60 * 1000
    ).toISOString()
    const tenDaysAgo = new Date(
      now.getTime() - 10 * 24 * 60 * 60 * 1000
    ).toISOString()

    const mockReleases = [
      {
        created_at: twoDaysAgo,
        draft: true,
        id: 1,
        name: "Release 1",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        created_at: fiveDaysAgo,
        draft: true,
        id: 2,
        name: "Release 2",
        prerelease: false,
        tag_name: "v1.0.1"
      },
      {
        created_at: tenDaysAgo,
        draft: true,
        id: 3,
        name: "Release 3",
        prerelease: false,
        tag_name: "v1.0.2-draft"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      daysToKeep: 4,
      // Keep releases newer than 4 days
      deleteDraftReleasesOnly: true,

      octokit,

      releasePattern: ".*",
      releasesToKeep: 0
    })

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(2)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 2
    })
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 3
    })
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalledWith({
      ...context.repo,
      release_id: 1
    }) // Release 1 should be kept
  })
})
