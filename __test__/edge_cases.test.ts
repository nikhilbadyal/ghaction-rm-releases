import {
  getMyOctokit,
  getReleases,
  rmReleases,
  deleteRelease,
  deleteTag
} from "../src/github"
import { getInputs } from "../src/utils"
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
  getInput: jest.fn(),
  info: jest.fn(),
  setFailed: jest.fn()
}))

const testTimeout = 30_000
jest.setTimeout(testTimeout)

describe("Edge Cases and Input Validation", () => {
  let mockOctokit: any
  let mockCore: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockCore = require("@actions/core")

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

  describe("Input validation", () => {
    it("should handle missing GITHUB_TOKEN", () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === "GITHUB_TOKEN") return ""
        if (name === "RELEASE_PATTERN") return "v*"
        return ""
      })

      expect(() => getInputs()).not.toThrow()
      const inputs = getInputs()
      expect(inputs.GITHUB_TOKEN).toBe("")
      expect(inputs.RELEASE_PATTERN).toBe("v*")
    })

    it("should handle missing RELEASE_PATTERN", () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === "GITHUB_TOKEN") return "token"
        if (name === "RELEASE_PATTERN") return ""
        return ""
      })

      const inputs = getInputs()
      expect(inputs.GITHUB_TOKEN).toBe("token")
      expect(inputs.RELEASE_PATTERN).toBe("")
    })

    it("should handle getInput throwing an error", () => {
      mockCore.getInput.mockImplementation(() => {
        throw new Error("Input error")
      })

      expect(() => getInputs()).toThrow("Input error")
    })
  })

  describe("Pattern matching edge cases", () => {
    it("should handle invalid regex patterns", async () => {
      const mockReleases = [
        {
          body: "Test release",
          draft: false,
          id: 1,
          name: "Release v1.0.0",
          prerelease: false,
          tag_name: "v1.0.0"
        }
      ]

      mockOctokit.paginate.mockResolvedValue(mockReleases)
      const octokit = getMyOctokit("mock-token")

      // Invalid regex pattern with unescaped characters
      const invalidPattern = "[invalid-regex"

      await expect(getReleases(octokit, invalidPattern)).rejects.toThrow(
        "Unable to list release: Invalid regular expression"
      )
    })

    it("should handle empty pattern", async () => {
      const mockReleases = [
        {
          body: "Test release",
          draft: false,
          id: 1,
          name: "Release v1.0.0",
          prerelease: false,
          tag_name: "v1.0.0"
        }
      ]

      mockOctokit.paginate.mockResolvedValue(mockReleases)
      const octokit = getMyOctokit("mock-token")

      const result = await getReleases(octokit, "")
      expect(result).toEqual([])
    })

    it("should handle releases with null/undefined tag_name", async () => {
      const mockReleases = [
        {
          body: "Test release",
          draft: false,
          id: 1,
          name: "Release v1.0.0",
          prerelease: false,
          tag_name: null
        },
        {
          body: "Test release 2",
          draft: false,
          id: 2,
          name: "Release v2.0.0",
          prerelease: false,
          tag_name: undefined
        },
        {
          body: "Valid release",
          draft: false,
          id: 3,
          name: "Release v3.0.0",
          prerelease: false,
          tag_name: "v3.0.0"
        }
      ]

      mockOctokit.paginate.mockResolvedValue(mockReleases)
      const octokit = getMyOctokit("mock-token")

      // Should filter out null/undefined tag_name and return only valid release
      const result = await getReleases(octokit, "v.*")
      expect(result).toHaveLength(1)
      expect(result[0].tag_name).toBe("v3.0.0")
    })

    it("should handle complex regex patterns", async () => {
      const mockReleases = [
        {
          body: "Test",
          draft: false,
          id: 1,
          name: "v1.0.0-alpha.1",
          prerelease: true,
          tag_name: "v1.0.0-alpha.1"
        },
        {
          body: "Test",
          draft: false,
          id: 2,
          name: "v1.0.0-beta.2",
          prerelease: true,
          tag_name: "v1.0.0-beta.2"
        },
        {
          body: "Test",
          draft: false,
          id: 3,
          name: "v1.0.0",
          prerelease: false,
          tag_name: "v1.0.0"
        }
      ]

      mockOctokit.paginate.mockResolvedValue(mockReleases)
      const octokit = getMyOctokit("mock-token")

      // Complex pattern to match only pre-release versions
      const result = await getReleases(
        octokit,
        "^v\\d+\\.\\d+\\.\\d+-\\w+\\.\\d+$"
      )
      expect(result).toHaveLength(2)
      expect(result[0].tag_name).toBe("v1.0.0-alpha.1")
      expect(result[1].tag_name).toBe("v1.0.0-beta.2")
    })
  })

  describe("Partial failure scenarios", () => {
    it("should handle partial failure in batch deletion", async () => {
      const mockReleases = [
        {
          body: "Test release 1",
          draft: false,
          id: 1,
          name: "Release v1.0.0",
          prerelease: false,
          tag_name: "v1.0.0"
        },
        {
          body: "Test release 2",
          draft: false,
          id: 2,
          name: "Release v2.0.0",
          prerelease: false,
          tag_name: "v2.0.0"
        }
      ]

      mockOctokit.paginate.mockResolvedValue(mockReleases)

      // First deletion succeeds, second fails
      mockOctokit.rest.repos.deleteRelease
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Release not found"))

      mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

      const octokit = getMyOctokit("mock-token")

      await expect(
        rmReleases({ octokit, releasePattern: "^v.*", releasesToKeep: 0 })
      ).rejects.toThrow("Release not found")
    })

    it("should handle deleteRelease success but deleteTag failure", async () => {
      const mockRelease = {
        body: "Test release",
        draft: false,
        id: 1,
        name: "Release v1.0.0",
        prerelease: false,
        tag_name: "v1.0.0"
      }

      mockOctokit.paginate.mockResolvedValue([mockRelease])
      mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
      mockOctokit.rest.git.deleteRef.mockRejectedValue(
        new Error("Tag not found")
      )

      const octokit = getMyOctokit("mock-token")

      await expect(
        rmReleases({ octokit, releasePattern: "^v.*", releasesToKeep: 0 })
      ).rejects.toThrow("Tag not found")

      // Verify release deletion was attempted
      expect(mockOctokit.rest.repos.deleteRelease).toHaveBeenCalledWith({
        owner: "nikhilbadyal",
        release_id: 1,
        repo: "test-repo"
      })
    })
  })

  describe("API response edge cases", () => {
    it("should handle malformed API response", async () => {
      // Mock API returning malformed data
      mockOctokit.paginate.mockResolvedValue([
        {
          // Missing required fields like tag_name
          id: 1,
          name: "Incomplete release"
        },
        null,
        undefined,
        {
          // Valid release
          body: "Valid",
          draft: false,
          id: 2,
          name: "Valid release",
          prerelease: false,
          tag_name: "v1.0.0"
        }
      ])

      const octokit = getMyOctokit("mock-token")

      // Should handle malformed data gracefully and return only valid releases
      const result = await getReleases(octokit, ".*")
      expect(result).toHaveLength(1)
      expect(result[0].tag_name).toBe("v1.0.0")
    })

    it("should handle very large number of releases", async () => {
      // Create 1000 mock releases
      const mockReleases = Array.from({ length: 1000 }, (_, i) => ({
        body: `Release ${i}`,
        draft: false,
        id: i + 1,
        name: `Release v${i}.0.0`,
        prerelease: false,
        tag_name: `v${i}.0.0`
      }))

      mockOctokit.paginate.mockResolvedValue(mockReleases)
      const octokit = getMyOctokit("mock-token")

      const result = await getReleases(octokit, "^v[0-9]+\\.0\\.0$")
      expect(result).toHaveLength(1000)
    })

    it("should handle non-Error objects thrown", async () => {
      // Mock API throwing a non-Error object
      mockOctokit.paginate.mockRejectedValue("String error message")

      const octokit = getMyOctokit("mock-token")

      await expect(getReleases(octokit, ".*")).rejects.toThrow(
        "Unable to list release: String error message"
      )
    })
  })

  describe("Token validation edge cases", () => {
    it("should handle whitespace-only token", () => {
      expect(() => getMyOctokit("   ")).toThrow("Need Github Token")
    })

    it("should handle null token", () => {
      // @ts-ignore - Testing runtime behavior
      expect(() => getMyOctokit(null)).toThrow("Need Github Token")
    })

    it("should handle undefined token", () => {
      // @ts-ignore - Testing runtime behavior
      expect(() => getMyOctokit(undefined)).toThrow("Need Github Token")
    })
  })

  describe("Release deletion with special characters", () => {
    it("should handle tag names with special characters", async () => {
      const specialRelease = {
        body: "Test release",
        created_at: "2023-01-01T00:00:00Z",
        draft: false,
        id: 1,
        name: "Release with special chars",
        prerelease: false,
        tag_name: "v1.0.0+build.123"
      }

      const octokit = getMyOctokit("mock-token")

      mockOctokit.rest.repos.deleteRelease.mockResolvedValue(undefined)
      mockOctokit.rest.git.deleteRef.mockResolvedValue(undefined)

      await expect(
        deleteRelease(octokit, specialRelease)
      ).resolves.not.toThrow()
      await expect(
        deleteTag(octokit, specialRelease.tag_name)
      ).resolves.not.toThrow()

      expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledWith({
        owner: "nikhilbadyal",
        ref: "tags/v1.0.0+build.123",
        repo: "test-repo"
      })
    })
  })
})
