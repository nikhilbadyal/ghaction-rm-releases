import { beforeEach, describe, expect, it, jest } from "@jest/globals"

// Mock all dependencies
jest.mock("@actions/core", () => ({
  info: jest.fn(),
  setFailed: jest.fn()
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
      DRY_RUN: false,
      EXCLUDE_PATTERN: "",
      GITHUB_TOKEN: "mock-token",
      RELEASES_TO_KEEP: 5,
      RELEASE_PATTERN: "^v0.0.*"
    })
    mockGithub.getMyOctokit.mockReturnValue({})
    mockGithub.rmReleases.mockResolvedValue(undefined)
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
      dryRun: false,
      excludePattern: "",
      octokit: {},
      releasePattern: "^v0.0.*",
      releasesToKeep: 5
    })
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
      DRY_RUN: true,
      EXCLUDE_PATTERN: "",
      GITHUB_TOKEN: "mock-token",
      RELEASES_TO_KEEP: 5,
      RELEASE_PATTERN: "^v0.0.*"
    })

    await import("../src/main")
    await new Promise(resolve => global.setTimeout(resolve, 100))

    expect(mockGithub.rmReleases).toHaveBeenCalledWith({
      daysToKeep: 0,
      dryRun: true,
      excludePattern: "",
      octokit: {},
      releasePattern: "^v0.0.*",
      releasesToKeep: 5
    })
  })
})
