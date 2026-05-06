import { getMyOctokit, rmReleases } from "../src/github"
import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { context } from "@actions/github"

jest.mock("@actions/github", () => ({
  context: {
    repo: {
      owner: "nikhilbadyal",
      repo: "test-repo"
    }
  },
  getOctokit: jest.fn()
}))

jest.mock("@actions/core", () => ({
  info: jest.fn(),
  setFailed: jest.fn(),
  warning: jest.fn()
}))

describe("new cleanup controls", () => {
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

  it("should apply draft-only and prerelease-only filters together", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: true,
        id: 1,
        name: "Draft stable",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        created_at: "2024-01-02T00:00:00Z",
        draft: false,
        id: 2,
        name: "Published prerelease",
        prerelease: true,
        tag_name: "v1.0.1-beta"
      },
      {
        created_at: "2024-01-03T00:00:00Z",
        draft: true,
        id: 3,
        name: "Draft prerelease",
        prerelease: true,
        tag_name: "v1.0.2-beta"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      deleteDraftReleasesOnly: true,
      deletePrereleasesOnly: true,
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0
    })

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledTimes(1)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 3
    })
  })

  it("should keep the minimum release safety floor", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Old release",
        prerelease: false,
        tag_name: "v1.0.0"
      },
      {
        created_at: "2024-01-02T00:00:00Z",
        draft: false,
        id: 2,
        name: "New release",
        prerelease: false,
        tag_name: "v2.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")

    const summary = await rmReleases({
      minReleasesToKeep: 1,
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0
    })

    expect(summary.keptCount).toEqual(1)
    expect(summary.deletedCount).toEqual(1)
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 1
    })
  })

  it("should preserve tags when deleteTags is false", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release",
        prerelease: false,
        tag_name: "v1.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)

    const octokit = getMyOctokit("mock-token")

    const summary = await rmReleases({
      deleteTags: false,
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0
    })

    expect(summary.deletedCount).toEqual(1)
    expect(summary.deletedTagsCount).toEqual(0)
    expect(mockOctokit.rest.git.deleteRef).not.toHaveBeenCalled()
  })

  it("should warn and continue when a deleted release tag is already missing", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release",
        prerelease: false,
        tag_name: "v1.0.0"
      }
    ]
    const notFoundError = Object.assign(new Error("Not Found"), {
      status: 404
    })
    const warningSpy = jest.spyOn(require("@actions/core"), "warning")

    mockOctokit.paginate.mockResolvedValue(mockReleases)
    mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
    mockOctokit.rest.git.deleteRef.mockRejectedValue(notFoundError)

    const octokit = getMyOctokit("mock-token")

    const summary = await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0
    })

    expect(summary.deletedCount).toEqual(1)
    expect(summary.deletedTagsCount).toEqual(0)
    expect(summary.skippedMissingTagsCount).toEqual(1)
    expect(warningSpy).toHaveBeenCalledWith(
      "Tag v1.0.0 was already missing, continuing cleanup."
    )
  })

  it("should return dry-run candidates without deleting releases", async () => {
    const mockReleases = [
      {
        created_at: "2024-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release",
        prerelease: false,
        tag_name: "v1.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    const octokit = getMyOctokit("mock-token")

    const summary = await rmReleases({
      dryRun: true,
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0
    })

    expect(summary.deleteCount).toEqual(1)
    expect(summary.deletedCount).toEqual(0)
    expect(summary.deleteCandidates).toEqual([
      { id: 1, name: "Release", tag_name: "v1.0.0" }
    ])
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
    expect(mockOctokit.rest.git.deleteRef).not.toHaveBeenCalled()
  })
})
