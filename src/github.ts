import { getOctokit, context } from '@actions/github'
import type { GitHub } from '@actions/github/lib/utils'
import { debug, info, setFailed } from '@actions/core'
import { asyncForEach } from './utils'
import type { OctokitOptions } from '@octokit/core/dist-types/types'
export interface Release {
  id: number
  name: string
  tag_name: string
  body: string
  draft: boolean
  prerelease: boolean
}
const minimumReleases = 0
export function getMyOctokit(
  token: string,
  options?: OctokitOptions
): InstanceType<typeof GitHub> {
  if (!token) {
    setFailed('No token provided')
  }
  debug('Initiating GitHub connection.')
  return getOctokit(token, options)
}

export async function getReleases(
  octokit,
  pattern: string
): Promise<Release[]> {
  debug(`Getting releases matching with ${pattern}`)
  try {
    const releases: Release[] = await octokit.paginate(
      octokit.rest.repos.listReleases,
      {
        ...context.repo
      }
    )
    return releases.filter(function releaseFilter(release) {
      return release.tag_name.match(pattern)
    })
  } catch (error) {
    throw new Error(`Unable to list release: ${error}`)
  }
}
async function deleteRelease(octokit, release: Release): Promise<void> {
  debug(`Deleting release ${release.id}`)
  try {
    await octokit.rest.repos.deleteRelease({
      ...context.repo,
      release_id: release.id
    })
  } catch (error) {
    throw new Error(`Unable to release tag ${release.id}: ${error}`)
  }
}

async function deleteTag(octokit, release: Release): Promise<void> {
  debug(`Deleting tag ${release.tag_name}`)
  try {
    await octokit.rest.git.deleteRef({
      ...context.repo,
      ref: `tags/${release.tag_name}`
    })
  } catch (error) {
    throw new Error(`Unable to delete tag ${release.tag_name}: ${error}`)
  }
}

async function deleteReleaseAndTag(octokit, release: Release): Promise<void> {
  await deleteRelease(octokit, release)
  await deleteTag(octokit, release)
}

export async function rmReleases(
  octokit,
  releasePattern: string
): Promise<void> {
  const releases: Release[] = await getReleases(octokit, releasePattern)
  const matches: number = releases.length
  if (matches > minimumReleases) {
    debug(`Found ${releases.length.toString()} to delete`)
    await asyncForEach(releases, async release => {
      info(`Deleting release ${release.name} with id ${release.id}`)
      await deleteReleaseAndTag(octokit, release)
    })
  } else {
    info('Nothing to delete.Exiting')
  }
}
