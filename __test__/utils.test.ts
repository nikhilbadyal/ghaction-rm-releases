/* eslint-disable @typescript-eslint/no-magic-numbers */
import { describe, expect, it } from '@jest/globals'
import { getInputs } from '../src/utils'

// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value
}
describe('get inputs', () => {
  it('should getInputs', async function () {
    setInput('GITHUB_TOKEN', 'mytoken')
    setInput('RELEASE_PATTERN', 'pattern*')
    let inputs = getInputs()
    expect(inputs.GITHUB_TOKEN).toEqual('mytoken')
    expect(inputs.RELEASE_PATTERN).toEqual('pattern*')
  })
})
