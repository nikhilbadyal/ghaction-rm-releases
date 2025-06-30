import { describe, expect, it } from "@jest/globals"
import { getInputs } from "../src/utils"

// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, "_").toUpperCase()}`
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value
}

describe("get inputs", () => {
  it("should getInputs", async function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    const inputs = getInputs()
    expect(inputs.GITHUB_TOKEN).toEqual("mytoken")
    expect(inputs.RELEASE_PATTERN).toEqual("pattern*")
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
    expect(() => getInputs()).toThrow("RELEASES_TO_KEEP must be a non-negative integer.")
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
    expect(() => getInputs()).toThrow("RELEASES_TO_KEEP must be a non-negative integer.")
  })

  it("should parse large RELEASES_TO_KEEP number", function () {
    setInput("GITHUB_TOKEN", "mytoken")
    setInput("RELEASE_PATTERN", "pattern*")
    setInput("RELEASES_TO_KEEP", "1000")
    const inputs = getInputs()
    expect(inputs.RELEASES_TO_KEEP).toEqual(1000)
  })
})
