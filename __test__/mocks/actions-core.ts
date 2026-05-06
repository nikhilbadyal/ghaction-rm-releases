interface InputOptions {
  // The shim keeps the same required-input contract that production code relies on when action.yml marks inputs as mandatory.
  readonly required?: boolean
  // The shim keeps whitespace handling configurable because @actions/core exposes that option and input parsing tests should not hide regressions there.
  readonly trimWhitespace?: boolean
}

function inputEnvironmentName(name: string): string {
  // GitHub Actions stores inputs in INPUT_* environment variables, so the test shim mirrors that documented lookup instead of returning canned values.
  return `INPUT_${name.replace(/ /g, "_").toUpperCase()}`
}

export function getInput(name: string, options: InputOptions = {}): string {
  // Missing inputs are represented as an empty string by @actions/core, which lets optional action inputs fall back in src/utils.ts.
  const value = process.env[inputEnvironmentName(name)] ?? ""

  if (options.required && value === "") {
    // Matching the toolkit error text keeps tests aligned with the real action runtime when a required input is absent.
    throw new Error(`Input required and not supplied: ${name}`)
  }

  if (options.trimWhitespace === false) {
    // Some callers intentionally preserve whitespace, so the shim keeps that branch even though current tests mostly use the default.
    return value
  }

  // @actions/core trims inputs by default, which is part of the contract src/utils.ts is parsing against.
  return value.trim()
}

export function info(message: string): void {
  // Most suites replace this export with jest.mock factories; console.info keeps the unmocked fallback close to the runtime logger.
  console.info(message)
}

export function setFailed(message: string | Error): void {
  // The runtime package marks the action failed by setting process.exitCode, so the shim keeps that side effect for any unmocked failure path.
  process.exitCode = 1
  // Logging the message makes an unexpected unmocked failure visible without changing thrown-error behavior in the tests.
  console.error(message)
}
