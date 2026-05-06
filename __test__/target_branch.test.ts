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
          getRef: jest.fn(),
          getTag: jest.fn()
        },
        repos: {
          deleteRelease: jest.fn(),
          listBranchesForHeadCommit: jest.fn(),
          listReleases: jest.fn()
        }
      }
    }

    const { getOctokit } = require("@actions/github")
    ;(getOctokit as jest.Mock).mockReturnValue(mockOctokit)
  })

  it("should only delete releases whose resolved commit is a matching branch head", async () => {
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
    mockOctokit.rest.git.getRef.mockImplementation(async ({ ref }) => ({
      data: {
        object: {
          sha: ref.replace("tags/v", "sha-"),
          type: "commit"
        }
      }
    }))
    mockOctokit.rest.repos.listBranchesForHeadCommit.mockImplementation(
      async ({ commit_sha: commitSha }) => {
        if (commitSha === "sha-1.0.0") {
          return { data: [{ name: "main" }] }
        }
        if (commitSha === "sha-1.0.1") {
          return { data: [{ name: "feature/test" }] }
        }
        return { data: [{ name: "main" }] }
      }
    )

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

  it("should preserve full branch names with slash segments", async () => {
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
      data: { object: { sha: "sha1", type: "commit" } }
    })
    mockOctokit.rest.repos.listBranchesForHeadCommit.mockResolvedValue({
      data: [{ name: "release/v1" }]
    })

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^release/v1$"
    })

    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 1
    })
  })

  it("should resolve annotated release tags before branch matching", async () => {
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
      data: { object: { sha: "annotated-tag-sha", type: "tag" } }
    })
    mockOctokit.rest.git.getTag.mockResolvedValue({
      data: { object: { sha: "commit-sha", type: "commit" } }
    })
    mockOctokit.rest.repos.listBranchesForHeadCommit.mockResolvedValue({
      data: [{ name: "release/v1" }]
    })

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^release/v1$"
    })

    expect(mockOctokit.rest.git.getTag).toHaveBeenCalledWith({
      ...context.repo,
      tag_sha: "annotated-tag-sha"
    })
    expect(
      mockOctokit.rest.repos.listBranchesForHeadCommit
    ).toHaveBeenCalledWith({
      ...context.repo,
      commit_sha: "commit-sha"
    })
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 1
    })
  })

  it("should skip releases whose tag target is not a commit", async () => {
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
      data: { object: { sha: "tree-sha", type: "tree" } }
    })

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^main$"
    })

    expect(
      mockOctokit.rest.repos.listBranchesForHeadCommit
    ).not.toHaveBeenCalled()
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
  })

  it("should skip annotated tags whose peeled object is not a commit", async () => {
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
      data: { object: { sha: "annotated-tag-sha", type: "tag" } }
    })
    mockOctokit.rest.git.getTag.mockResolvedValue({
      data: { object: { sha: "tree-sha", type: "tree" } }
    })

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^main$"
    })

    expect(
      mockOctokit.rest.repos.listBranchesForHeadCommit
    ).not.toHaveBeenCalled()
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
  })

  it("should keep releases when branch lookup fails", async () => {
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
    const infoSpy = jest.spyOn(require("@actions/core"), "info")

    mockOctokit.paginate.mockResolvedValue(mockReleases)
    mockOctokit.rest.git.getRef.mockRejectedValue(
      new Error("Failed to get ref")
    )

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^main$"
    })

    expect(infoSpy).toHaveBeenCalledWith(
      "Could not fetch target branches for release v1.0.0: Failed to get ref"
    )
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
  })

  it("should log non-Error branch lookup failures", async () => {
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
    const infoSpy = jest.spyOn(require("@actions/core"), "info")

    mockOctokit.paginate.mockResolvedValue(mockReleases)
    mockOctokit.rest.git.getRef.mockRejectedValue("Network timeout")

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: "^main$"
    })

    expect(infoSpy).toHaveBeenCalledWith(
      "Could not fetch target branches for release v1.0.0: Network timeout"
    )
    expect(mockOctokit.rest.repos.deleteRelease).not.toHaveBeenCalled()
  })

  it("should not fetch branch data when targetBranchPattern is empty", async () => {
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

    const octokit = getMyOctokit("mock-token")

    await rmReleases({
      octokit,
      releasePattern: ".*",
      releasesToKeep: 0,
      targetBranchPattern: ""
    })

    expect(mockOctokit.rest.git.getRef).not.toHaveBeenCalled()
    expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
      ...context.repo,
      release_id: 1
    })
  })
})
