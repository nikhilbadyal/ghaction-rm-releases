import { beforeEach, describe, expect, it, jest } from "@jest/globals"

// Mock all dependencies
jest.mock("@actions/core", () => ({
  info: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn()
}))

jest.mock("../src/github", () => ({
  getMyOctokit: jest.fn(),
  rmReleases: jest.fn()
}))

jest.mock("../src/utils", () => ({
  getInputs: jest.fn()
}))

const testTimeout = 30_000
jest.setTimeout(testTimeout)

const successfulSummary = {
  deleteCandidates: [],
  deleteCount: 0,
  deletedCount: 0,
  deletedReleases: [],
  deletedTagsCount: 0,
  keptCount: 5,
  matchedCount: 5,
  skippedMissingTagsCount: 0
}

describe("main.ts", () => {
  let mockCore: any
  let mockGithub: any
  let mockUtils: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset modules to get fresh imports
    jest.resetModules()

    mockCore = require("@actions/core")
    mockGithub = require("../src/github")
    mockUtils = require("../src/utils")

    // Setup default mocks
    mockUtils.getInputs.mockReturnValue({
      DAYS_TO_KEEP: 0,
      DELETE_DRAFT_RELEASES_ONLY: false,
      DELETE_PRERELEASES_ONLY: false,
      DELETE_TAGS: true,
      DRY_RUN: false,
      EXCLUDE_PATTERN: "",
      GITHUB_TOKEN: "mock-token",
      MAX_CONCURRENCY: 5,
      MIN_RELEASES_TO_KEEP: 0,
      RELEASES_TO_KEEP: 5,
      RELEASE_PATTERN: "^v0.0.*",
      TARGET_BRANCH_PATTERN: ""
    })
    mockGithub.getMyOctokit.mockReturnValue({})
    mockGithub.rmReleases.mockResolvedValue(successfulSummary)
  })

  it("should run successfully with valid inputs", async () => {
    // Import and run main
    await import("../src/main")

    // Allow async operations to complete
    await new Promise(resolve => global.setTimeout(resolve, 100))

    expect(mockCore.info).toHaveBeenCalledWith("Getting gitHub Token")
    expect(mockUtils.getInputs).toHaveBeenCalled()
    expect(mockGithub.getMyOctokit).toHaveBeenCalledWith("mock-token")
    expect(mockGithub.rmReleases).toHaveBeenCalledWith({
      daysToKeep: 0,
      deleteDraftReleasesOnly: false,
      deletePrereleasesOnly: false,
      deleteTags: true,
      dryRun: false,
      excludePattern: "",
      maxConcurrency: 5,
      minReleasesToKeep: 0,
      octokit: {},
      releasePattern: "^v0.0.*",
      releasesToKeep: 5,
      targetBranchPattern: ""
    })
    expect(mockCore.setOutput).toHaveBeenCalledWith("matched_count", 5)
    expect(mockCore.setOutput).toHaveBeenCalledWith(
      "summary_json",
      JSON.stringify(successfulSummary)
    )
    expect(mockCore.setFailed).not.toHaveBeenCalled()
  })

  it("should handle errors in getInputs", async () => {
    mockUtils.getInputs.mockImplementation(() => {
      throw new Error("Missing required input")
    })

    await import("../src/main")
    await new Promise(resolve => global.setTimeout(resolve, 100))

    expect(mockCore.setFailed).toHaveBeenCalledWith("Missing required input")
  })

  it("should handle errors in getMyOctokit", async () => {
    mockGithub.getMyOctokit.mockImplementation(() => {
      throw new Error("Invalid token")
    })

    await import("../src/main")
    await new Promise(resolve => global.setTimeout(resolve, 100))

    expect(mockCore.setFailed).toHaveBeenCalledWith("Invalid token")
  })

  it("should handle errors in rmReleases", async () => {
    mockGithub.rmReleases.mockRejectedValue(new Error("API Error"))

    await import("../src/main")
    await new Promise(resolve => global.setTimeout(resolve, 100))

    expect(mockCore.setFailed).toHaveBeenCalledWith("API Error")
  })

  it("should handle non-Error objects thrown", async () => {
    mockGithub.rmReleases.mockRejectedValue("String error")

    await import("../src/main")
    await new Promise(resolve => global.setTimeout(resolve, 100))

    // Should call setFailed for non-Error objects
    expect(mockCore.setFailed).toHaveBeenCalledWith("String error")
  })

  it("should call rmReleases with dryRun true when DRY_RUN input is true", async () => {
    mockUtils.getInputs.mockReturnValue({
      DAYS_TO_KEEP: 0,
      DELETE_DRAFT_RELEASES_ONLY: false,
      DELETE_PRERELEASES_ONLY: false,
      DELETE_TAGS: true,
      DRY_RUN: true,
      EXCLUDE_PATTERN: "",
      GITHUB_TOKEN: "mock-token",
      MAX_CONCURRENCY: 5,
      MIN_RELEASES_TO_KEEP: 0,
      RELEASES_TO_KEEP: 5,
      RELEASE_PATTERN: "^v0.0.*",
      TARGET_BRANCH_PATTERN: ""
    })

    await import("../src/main")
    await new Promise(resolve => global.setTimeout(resolve, 100))

    expect(mockGithub.rmReleases).toHaveBeenCalledWith({
      daysToKeep: 0,
      deleteDraftReleasesOnly: false,
      deletePrereleasesOnly: false,
      deleteTags: true,
      dryRun: true,
      excludePattern: "",
      maxConcurrency: 5,
      minReleasesToKeep: 0,
      octokit: {},
      releasePattern: "^v0.0.*",
      releasesToKeep: 5,
      targetBranchPattern: ""
    })
  })
})
