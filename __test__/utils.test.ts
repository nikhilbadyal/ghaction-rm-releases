import { describe, expect, it, beforeEach } from "@jest/globals"
import { getInputs } from "../src/utils"

// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, "_").toUpperCase()}`
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value
}

function clearInputs(): void {
  delete process.env[getInputName("GITHUB_TOKEN")]
  delete process.env[getInputName("RELEASE_PATTERN")]
  delete process.env[getInputName("RELEASES_TO_KEEP")]
  delete process.env[getInputName("MIN_RELEASES_TO_KEEP")]
  delete process.env[getInputName("DAYS_TO_KEEP")]
  delete process.env[getInputName("EXCLUDE_PATTERN")]
  delete process.env[getInputName("DRY_RUN")]
  delete process.env[getInputName("DELETE_TAGS")]
  delete process.env[getInputName("DELETE_DRAFT_RELEASES_ONLY")]
  delete process.env[getInputName("DELETE_PRERELEASES_ONLY")]
  delete process.env[getInputName("TARGET_BRANCH_PATTERN")]
  delete process.env[getInputName("MAX_CONCURRENCY")]
}

describe("get inputs", () => {
  beforeEach(() => {
    clearInputs()
  })
  it("should getInputs", async function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    const inputs = getInputs()
    expect(inputs.GITHUB_TOKEN).toEqual("mytoken")
    expect(inputs.RELEASE_PATTERN).toEqual("pattern*")
  })

  it("should apply defaults for optional safety and execution controls", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")

    const inputs = getInputs()

    expect(inputs.DELETE_TAGS).toEqual(true)
    expect(inputs.MAX_CONCURRENCY).toEqual(5)
    expect(inputs.MIN_RELEASES_TO_KEEP).toEqual(0)
  })

  it("should handle default RELEASES_TO_KEEP when not provided", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    // Not setting RELEASES_TO_KEEP
    const inputs = getInputs()
    expect(inputs.RELEASES_TO_KEEP).toEqual(0)
  })

  it("should parse valid RELEASES_TO_KEEP number", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "5")
    const inputs = getInputs()
    expect(inputs.RELEASES_TO_KEEP).toEqual(5)
  })

  it("should handle RELEASES_TO_KEEP as 0", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "0")
    const inputs = getInputs()
    expect(inputs.RELEASES_TO_KEEP).toEqual(0)
  })

  it("should throw an error for invalid RELEASES_TO_KEEP string", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "invalid")
    expect(() => getInputs()).toThrow(
      "RELEASES_TO_KEEP must be a non-negative integer."
    )
  })

  it("should default to 0 for empty RELEASES_TO_KEEP", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "")
    const inputs = getInputs()
    expect(inputs.RELEASES_TO_KEEP).toEqual(0)
  })

  it("should throw an error for negative RELEASES_TO_KEEP", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "-5")
    expect(() => getInputs()).toThrow(
      "RELEASES_TO_KEEP must be a non-negative integer."
    )
  })

  it("should parse large RELEASES_TO_KEEP number", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "1000")
    const inputs = getInputs()
    expect(inputs.RELEASES_TO_KEEP).toEqual(1000)
  })

  it("should throw an error for decimal RELEASES_TO_KEEP", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "5.5")
    expect(() => getInputs()).toThrow(
      "RELEASES_TO_KEEP must be a non-negative integer."
    )
  })

  // DAYS_TO_KEEP tests
  it("should handle default DAYS_TO_KEEP when not provided", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "0")
    // Not setting DAYS_TO_KEEP
    const inputs = getInputs()
    expect(inputs.DAYS_TO_KEEP).toEqual(0)
  })

  it("should parse valid DAYS_TO_KEEP number", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "0")
    setInput("DAYS_TO_KEEP", "30")
    const inputs = getInputs()
    expect(inputs.DAYS_TO_KEEP).toEqual(30)
  })

  it("should handle DAYS_TO_KEEP as 0", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "0")
    setInput("DAYS_TO_KEEP", "0")
    const inputs = getInputs()
    expect(inputs.DAYS_TO_KEEP).toEqual(0)
  })

  it("should throw an error for invalid DAYS_TO_KEEP string", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "0")
    setInput("DAYS_TO_KEEP", "invalid")
    expect(() => getInputs()).toThrow(
      "DAYS_TO_KEEP must be a non-negative integer."
    )
  })

  it("should default to 0 for empty DAYS_TO_KEEP", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "0")
    setInput("DAYS_TO_KEEP", "")
    const inputs = getInputs()
    expect(inputs.DAYS_TO_KEEP).toEqual(0)
  })

  it("should throw an error for negative DAYS_TO_KEEP", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "0")
    setInput("DAYS_TO_KEEP", "-10")
    expect(() => getInputs()).toThrow(
      "DAYS_TO_KEEP must be a non-negative integer."
    )
  })

  it("should parse large DAYS_TO_KEEP number", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "0")
    setInput("DAYS_TO_KEEP", "365")
    const inputs = getInputs()
    expect(inputs.DAYS_TO_KEEP).toEqual(365)
  })

  it("should throw an error for decimal DAYS_TO_KEEP", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "0")
    setInput("DAYS_TO_KEEP", "30.5")
    expect(() => getInputs()).toThrow(
      "DAYS_TO_KEEP must be a non-negative integer."
    )
  })

  it("should parse MIN_RELEASES_TO_KEEP and MAX_CONCURRENCY", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("MIN_RELEASES_TO_KEEP", "2")
    setInput("MAX_CONCURRENCY", "3")

    const inputs = getInputs()

    expect(inputs.MIN_RELEASES_TO_KEEP).toEqual(2)
    expect(inputs.MAX_CONCURRENCY).toEqual(3)
  })

  it("should require MAX_CONCURRENCY to be positive", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("MAX_CONCURRENCY", "0")

    expect(() => getInputs()).toThrow(
      "MAX_CONCURRENCY must be a positive integer."
    )
  })

  it("should parse YAML-style boolean inputs", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("DRY_RUN", "TRUE")
    setInput("DELETE_TAGS", "False")

    const inputs = getInputs()

    expect(inputs.DRY_RUN).toEqual(true)
    expect(inputs.DELETE_TAGS).toEqual(false)
  })

  it("should reject invalid boolean inputs", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("DELETE_TAGS", "yes")

    expect(() => getInputs()).toThrow(
      "DELETE_TAGS must be a boolean value: true or false."
    )
  })
})
