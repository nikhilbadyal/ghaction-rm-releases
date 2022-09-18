/* eslint-disable @typescript-eslint/no-magic-numbers */
import { describe, expect, it } from '@jest/globals'
import {
  deleteRelease,
  deleteTag,
  getMyOctokit,
  getReleases,
  Release,
  rmReleases
} from '../src/github'
import { debug } from '@actions/core'
import { getInputs } from '../src/utils'

// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value
}
describe('github', () => {
  it('should getInputs', async function () {
    await setInput('GITHUB_TOKEN', 'mytoken')
    await setInput('RELEASE_PATTERN', 'pattern*')
    let inputs = getInputs()
    expect(inputs.GITHUB_TOKEN).toEqual('mytoken')
    expect(inputs.RELEASE_PATTERN).toEqual('pattern*')
  })
})
