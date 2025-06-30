import { getMyOctokit, getReleases } from "../src/github"
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

describe("fetching test cases", () => {
  let mockOctokit: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock octokit instance
    mockOctokit = {
      paginate: jest.fn(),
      rest: {
        repos: {
          listReleases: jest.fn()
        }
      }
    }

    // Mock the getOctokit function to return our mock
    const { getOctokit } = require("@actions/github")
    ;(getOctokit as jest.Mock).mockReturnValue(mockOctokit)
  })

  it("should getReleases exact version", async function () {
    // Mock releases data
    const mockReleases = [
      {
        body: "Test release",
        draft: false,
        id: 1,
        name: "Release v0.0.1",
        prerelease: false,
        tag_name: "v0.0.1"
      },
      {
        body: "Test release 2",
        draft: false,
        id: 2,
        name: "Release v0.0.2",
        prerelease: false,
        tag_name: "v0.0.2"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    const octokit = getMyOctokit("mock-token")
    const release = await getReleases(octokit, "^v0.0.1$")

    expect(release).not.toBeUndefined()
    expect(release.length).toEqual(1)
    expect(release[0].tag_name).toEqual("v0.0.1")
  })

  it("should getReleases with wildcard", async function () {
    // Mock releases data
    const mockReleases = [
      {
        body: "Test release",
        draft: false,
        id: 1,
        name: "Release v0.0.1",
        prerelease: false,
        tag_name: "v0.0.1"
      },
      {
        body: "Test release 2",
        draft: false,
        id: 2,
        name: "Release v0.0.2",
        prerelease: false,
        tag_name: "v0.0.2"
      },
      {
        body: "Major release",
        draft: false,
        id: 3,
        name: "Release v1.0.0",
        prerelease: false,
        tag_name: "v1.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    const octokit = getMyOctokit("mock-token")
    const release = await getReleases(octokit, "^v0.0.*")

    expect(release).not.toBeUndefined()
    expect(release.length).toEqual(2)
    expect(release[0].tag_name).toEqual("v0.0.1")
    expect(release[1].tag_name).toEqual("v0.0.2")
  })

  it("should handle API errors gracefully", async function () {
    mockOctokit.paginate.mockRejectedValue(new Error("API Error"))

    const octokit = getMyOctokit("mock-token")

    await expect(getReleases(octokit, "^v0.0.*")).rejects.toThrow(
      "Unable to list release: API Error"
    )
  })

  it("should return empty array when no releases match pattern", async function () {
    const mockReleases = [
      {
        body: "Major release",
        draft: false,
        id: 1,
        name: "Release v1.0.0",
        prerelease: false,
        tag_name: "v1.0.0"
      }
    ]

    mockOctokit.paginate.mockResolvedValue(mockReleases)

    const octokit = getMyOctokit("mock-token")
    const release = await getReleases(octokit, "^v0.0.*")

    expect(release).not.toBeUndefined()
    expect(release.length).toEqual(0)
  })

  it("should handle invalid regex pattern gracefully", async function () {
    const octokit = getMyOctokit("mock-token")
    const invalidPattern = "["

    await expect(getReleases(octokit, invalidPattern)).rejects.toThrow(
      /Invalid regular expression/
    )
  })
})
