import { getMyOctokit, rmReleases } from "../src/github"
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
  it("should delete all releases if DAYS_TO_KEEP is not provided (default: ignore age filtering)", async function () {
    const now = new Date()
    const mockReleases = [
      {
        body: "Old release",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 365 * 10
        ).toISOString(), // 10 years ago
        draft: false,
        id: 1,
        name: "Release v1.0.0",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        body: "Recent release",
        created_at: now.toISOString(),
        draft: false,
        id: 2,
        name: "Release v2.0.0",
        prerelease: false,
        tag_name: "v2.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    // DAYS_TO_KEEP not passed, age filtering ignored, RELEASES_TO_KEEP is 0 so delete all
    await rmReleases(octokit, "^v.*", 0)

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(2)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(2)
  })

  it("should delete releases older than DAYS_TO_KEEP days", async function () {
    const now = new Date()
    const mockReleases = [
      {
        body: "Old release",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 10
        ).toISOString(), // 10 days ago
        draft: false,
        id: 1,
        name: "Release v1.0.0",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        body: "Recent release",
        created_at: now.toISOString(),
        draft: false,
        id: 2,
        name: "Release v2.0.0",
        prerelease: false,
        tag_name: "v2.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    // Only keep releases from last 5 days
    await rmReleases(octokit, "^v.*", 0, 5)

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      release_id: 1,
      repo: "test-repo"
    })
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      ref: "tags/v1.0.0",
      repo: "test-repo"
    })
  })

  it("should keep all releases if DAYS_TO_KEEP is a very high value", async function () {
    const now = new Date()
    const mockReleases = [
      {
        body: "Old release",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 9999
        ).toISOString(), // ~27 years ago, but safely under 10000 days
        draft: false,
        id: 1,
        name: "Release v1.0.0",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        body: "Recent release",
        created_at: now.toISOString(),
        draft: false,
        id: 2,
        name: "Release v2.0.0",
        prerelease: false,
        tag_name: "v2.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    // DAYS_TO_KEEP is very high, should keep all
    await rmReleases(octokit, "^v.*", 0, 10000)

    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
    expect(mockOctokit.rest.git.deleteRef).not.toHaveBeenCalled()
  })

  it("should handle combination of RELEASES_TO_KEEP and DAYS_TO_KEEP", async function () {
    const now = new Date()
    const mockReleases = [
      {
        body: "Very old release",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 100
        ).toISOString(), // 100 days ago
        draft: false,
        id: 1,
        name: "Release v1.0.0",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        body: "Old release",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 20
        ).toISOString(), // 20 days ago
        draft: false,
        id: 2,
        name: "Release v2.0.0",
        prerelease: false,
        tag_name: "v2.0.0"
      },
      {
        body: "Recent release",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 5
        ).toISOString(), // 5 days ago
        draft: false,
        id: 3,
        name: "Release v3.0.0",
        prerelease: false,
        tag_name: "v3.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    // Keep 1 release by count, keep releases newer than 30 days by age
    // v3.0.0 should be kept by count (most recent)
    // v2.0.0 should be kept by age (20 days < 30 days)
    // v1.0.0 should be deleted (not kept by count and older than 30 days)
    await rmReleases(octokit, "^v.*", 1, 30)

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      release_id: 1,
      repo: "test-repo"
    })
  })

  it("should handle invalid created_at dates gracefully", async function () {
    const now = new Date()
    const mockReleases = [
      {
        body: "Invalid date release",
        created_at: "invalid-date",
        draft: false,
        id: 1,
        name: "Release v1.0.0",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        body: "Valid date release",
        created_at: now.toISOString(),
        draft: false,
        id: 2,
        name: "Release v2.0.0",
        prerelease: false,
        tag_name: "v2.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    // Keep releases from last 30 days
    await rmReleases(octokit, "^v.*", 0, 30)

    // Invalid date should be treated as very old (NaN age), so it should be deleted
    // Valid recent date should be kept
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      release_id: 1,
      repo: "test-repo"
    })
  })

  it("should handle DAYS_TO_KEEP with EXCLUDE_PATTERN", async function () {
    const now = new Date()
    const mockReleases = [
      {
        body: "Old release to exclude",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 50
        ).toISOString(), // 50 days ago
        draft: false,
        id: 1,
        name: "Release v1.0.0-rc",
        prerelease: false,
        tag_name: "v1.0.0-rc"
      },
      {
        body: "Old release to delete",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 50
        ).toISOString(), // 50 days ago
        draft: false,
        id: 2,
        name: "Release v2.0.0",
        prerelease: false,
        tag_name: "v2.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    // Keep releases from last 30 days, exclude RC releases
    await rmReleases(octokit, "^v.*", 0, 30, ".*-rc$")

    // Only v2.0.0 should be deleted (older than 30 days and not excluded)
    // v1.0.0-rc should be excluded from deletion
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      release_id: 2,
      repo: "test-repo"
    })
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

  it("should handle combination of all three parameters: RELEASES_TO_KEEP + DAYS_TO_KEEP + EXCLUDE_PATTERN", async function () {
    const now = new Date()
    const mockReleases = [
      {
        body: "Very old excluded release",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 100
        ).toISOString(), // 100 days ago
        draft: false,
        id: 1,
        name: "Release v1.0.0-stable",
        prerelease: false,
        tag_name: "v1.0.0-stable"
      },
      {
        body: "Old release (should be deleted)",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 50
        ).toISOString(), // 50 days ago
        draft: false,
        id: 2,
        name: "Release v2.0.0",
        prerelease: false,
        tag_name: "v2.0.0"
      },
      {
        body: "Medium age release (kept by age)",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 20
        ).toISOString(), // 20 days ago
        draft: false,
        id: 3,
        name: "Release v3.0.0",
        prerelease: false,
        tag_name: "v3.0.0"
      },
      {
        body: "Recent release 1 (kept by count)",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 10
        ).toISOString(), // 10 days ago
        draft: false,
        id: 4,
        name: "Release v4.0.0",
        prerelease: false,
        tag_name: "v4.0.0"
      },
      {
        body: "Recent release 2 (kept by count)",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 5
        ).toISOString(), // 5 days ago
        draft: false,
        id: 5,
        name: "Release v5.0.0",
        prerelease: false,
        tag_name: "v5.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    // Keep 2 most recent, keep releases newer than 30 days, exclude stable releases
    await rmReleases(octokit, "^v.*", 2, 30, ".*-stable$")

    // Expected behavior:
    // v5.0.0: kept by count (most recent)
    // v4.0.0: kept by count (2nd most recent)
    // v3.0.0: kept by age (20 days < 30 days)
    // v2.0.0: deleted (not in top 2, older than 30 days, not excluded)
    // v1.0.0-stable: not deleted (excluded by pattern)

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      release_id: 2,
      repo: "test-repo"
    })
  })

  it("should handle RELEASES_TO_KEEP + EXCLUDE_PATTERN combination", async function () {
    const now = new Date()
    const mockReleases = [
      {
        body: "Release 1 (excluded)",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 5
        ).toISOString(),
        draft: false,
        id: 1,
        name: "Release v1.0.0-rc",
        prerelease: false,
        tag_name: "v1.0.0-rc"
      },
      {
        body: "Release 2 (most recent, kept)",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 4
        ).toISOString(),
        draft: false,
        id: 2,
        name: "Release v2.0.0",
        prerelease: false,
        tag_name: "v2.0.0"
      },
      {
        body: "Release 3 (2nd most recent, kept)",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 3
        ).toISOString(),
        draft: false,
        id: 3,
        name: "Release v3.0.0",
        prerelease: false,
        tag_name: "v3.0.0"
      },
      {
        body: "Release 4 (should be deleted)",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 2
        ).toISOString(),
        draft: false,
        id: 4,
        name: "Release v4.0.0",
        prerelease: false,
        tag_name: "v4.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    // Keep 2 most recent (after exclusion), exclude RC releases
    await rmReleases(octokit, "^v.*", 2, undefined, ".*-rc$")

    // After exclusion: v2.0.0, v3.0.0, v4.0.0 (v1.0.0-rc excluded)
    // Sorted by date (newest first): v4.0.0 (2 days), v3.0.0 (3 days), v2.0.0 (4 days)
    // Keep top 2: v4.0.0 (most recent), v3.0.0 (2nd most recent)
    // Delete: v2.0.0 (oldest after exclusion)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      release_id: 2,
      repo: "test-repo"
    })
  })

  it("should handle edge case where RELEASES_TO_KEEP equals total available releases", async function () {
    const now = new Date()
    const mockReleases = [
      {
        body: "Release 1",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 2
        ).toISOString(),
        draft: false,
        id: 1,
        name: "Release v1.0.0",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        body: "Release 2",
        created_at: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 1
        ).toISOString(),
        draft: false,
        id: 2,
        name: "Release v2.0.0",
        prerelease: false,
        tag_name: "v2.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    // Keep exactly as many as we have
    await rmReleases(octokit, "^v.*", 2)

    // Should delete nothing
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
    expect(mockOctokit.rest.git.deleteRef).not.toHaveBeenCalled()
  })

  it("should handle edge case where RELEASES_TO_KEEP exceeds total available releases", async function () {
    const now = new Date()
    const mockReleases = [
      {
        body: "Only release",
        created_at: now.toISOString(),
        draft: false,
        id: 1,
        name: "Release v1.0.0",
        prerelease: false,
        tag_name: "v1.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    // Try to keep more than we have
    await rmReleases(octokit, "^v.*", 5)

    // Should delete nothing (keep the 1 available release)
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
    expect(mockOctokit.rest.git.deleteRef).not.toHaveBeenCalled()
  })

  it("should handle releases created at exact boundary time for DAYS_TO_KEEP", async function () {
    const now = new Date()
    // Create releases with clear age differences to avoid precision issues
    const withinBoundaryTime = new Date(
      now.getTime() - 1000 * 60 * 60 * 24 * 29.5
    ) // 29.5 days ago (safely within 30 days)
    const beyondBoundaryTime = new Date(
      now.getTime() - 1000 * 60 * 60 * 24 * 31
    ) // 31 days ago (clearly beyond 30 days)
    const recentTime = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10) // 10 days ago

    const mockReleases = [
      {
        body: "Within boundary release (should be kept)",
        created_at: withinBoundaryTime.toISOString(),
        draft: false,
        id: 1,
        name: "Release v1.0.0",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        body: "Beyond boundary release (should be deleted)",
        created_at: beyondBoundaryTime.toISOString(),
        draft: false,
        id: 2,
        name: "Release v2.0.0",
        prerelease: false,
        tag_name: "v2.0.0"
      },
      {
        body: "Recent release (should be kept)",
        created_at: recentTime.toISOString(),
        draft: false,
        id: 3,
        name: "Release v3.0.0",
        prerelease: false,
        tag_name: "v3.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")
    await rmReleases(octokit, "^v.*", 0, 30)

    // Should delete only v2.0.0 (31 days old, beyond 30-day limit)
    // Should keep v1.0.0 (29.5 days old, within limit) and v3.0.0 (10 days old)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      owner: "nikhilbadyal",
      release_id: 2,
      repo: "test-repo"
    })
  })

  it("should not exclude any releases if EXCLUDE_PATTERN is empty", async function () {
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
    await rmReleases(octokit, "^v0.0.*", 0, 0, "") // Empty exclude pattern

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(2)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(2)
  })

  it("should not exclude any releases if EXCLUDE_PATTERN is not provided", async function () {
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
    await rmReleases(octokit, "^v0.0.*", 0, 0, "") // Exclude pattern not provided

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(2)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(2)
  })

  it("should throw if EXCLUDE_PATTERN is invalid regex", async function () {
    const mockReleases = [
      {
        body: "Test release 1",
        created_at: "2023-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release v0.0.1",
        prerelease: false,
        tag_name: "v0.0.1"
      }
    ]

    mockOctokit.paginate.mockResolvedValueOnce(mockReleases)
    const octokit = getMyOctokit("mock-token")
    await expect(rmReleases(octokit, "^v0.0.*", 0, 0, "[")).rejects.toThrow()
  })

  it("should exclude all releases if EXCLUDE_PATTERN matches all", async function () {
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
    await rmReleases(octokit, "^v0.0.*", 0, 0, ".*")

    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
    expect(mockOctokit.rest.git.deleteRef).not.toHaveBeenCalled()
  })

  it("should not exclude any releases if EXCLUDE_PATTERN matches none", async function () {
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
    await rmReleases(octokit, "^v0.0.*", 0, 0, "doesnotmatch")

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(2)
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledTimes(2)
  })
})
