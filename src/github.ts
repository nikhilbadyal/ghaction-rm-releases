import { getOctokit, context } from "@actions/github"
import type { GitHub } from "@actions/github/lib/utils"
import { info, setFailed } from "@actions/core"
import type { OctokitOptions } from "@octokit/core/dist-types/types"

export interface Release {
  id: number
  name: string
  tag_name: string
  body: string
  draft: boolean
  prerelease: boolean
  created_at: string
}

export function getMyOctokit(
  token: string,
  options?: OctokitOptions
): InstanceType<typeof GitHub> {
  info("Initiating GitHub connection.")
  if (!token || token.trim() === "") {
    setFailed("Need Github Token")
    throw new Error("Need Github Token")
  }
  return getOctokit(token, options)
}

export async function getReleases(
  octokit,
  pattern: string
): Promise<Release[]> {
  info(`Getting releases matching with ${pattern}`)

  // Return empty array for empty pattern
  if (!pattern || pattern === "") {
    return []
  }

  try {
    const releases: Release[] = await octokit.paginate(
      octokit.rest.repos.listReleases,
      {
        ...context.repo
      }
    )
    const regex = new RegExp(pattern)
    return releases
      .filter(function releaseFilter(release) {
        // Handle null/undefined release objects and tag_name gracefully
        if (!release?.tag_name) {
          return false
        }
        return regex.test(release.tag_name)
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()

        // Handle invalid dates by treating them as the earliest possible time
        const timeA = Number.isNaN(dateA) ? 0 : dateA
        const timeB = Number.isNaN(dateB) ? 0 : dateB

        return timeB - timeA
      })
  } catch (error) {
    throw new Error(
      `Unable to list release: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export async function deleteRelease(
  octokit: InstanceType<typeof GitHub>,
  release: Release
): Promise<void> {
  info(`Deleting release ${release.id}`)
  try {
    await octokit.rest.repos.deleteRelease({
      ...context.repo,
      release_id: release.id
    })
  } catch (error) {
    throw new Error(
      `Unable to delete release ${release.id}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export async function deleteTag(
  octokit: InstanceType<typeof GitHub>,
  tagName: string
): Promise<void> {
  info(`Deleting tag ${tagName}`)
  try {
    await octokit.rest.git.deleteRef({
      ...context.repo,
      ref: `tags/${tagName}`
    })
  } catch (error) {
    throw new Error(
      `Unable to delete tag ${tagName}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function deleteReleaseAndTag(
  octokit: InstanceType<typeof GitHub>,
  release: Release
): Promise<void> {
  await deleteRelease(octokit, release)
  await deleteTag(octokit, release.tag_name)
}

export interface RmReleasesOptions {
  octokit: InstanceType<typeof GitHub>
  releasePattern: string
  releasesToKeep: number
  daysToKeep?: number
  excludePattern?: string
  dryRun?: boolean
}

export async function rmReleases({
  octokit,
  releasePattern,
  releasesToKeep,
  daysToKeep,
  excludePattern = "",
  dryRun = false
}: RmReleasesOptions): Promise<void> {
  let releases: Release[] = await getReleases(octokit, releasePattern)

  if (excludePattern) {
    const excludeRegex = new RegExp(excludePattern)
    releases = releases.filter(release => !excludeRegex.test(release.tag_name))
  }

  const releasesToDelete: Release[] = []
  const now = new Date()

  for (let i = 0; i < releases.length; i++) {
    const release = releases[i]
    const releaseDate = new Date(release.created_at)
    const ageInDays =
      (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24)

    const shouldKeepByCount = i < releasesToKeep
    // If daysToKeep is undefined or 0, ignore age filtering (don't keep by age)
    // If daysToKeep > 0, keep releases that are newer than the specified days
    const shouldKeepByAge =
      typeof daysToKeep === "number" &&
      daysToKeep > 0 &&
      ageInDays <= daysToKeep

    if (!shouldKeepByCount && !shouldKeepByAge) {
      releasesToDelete.push(release)
    }
  }

  const matches: number = releases.length
  const keptReleasesCount = matches - releasesToDelete.length

  if (releasesToDelete.length === 0) {
    info(
      `Found ${matches} releases matching the pattern. No releases to delete based on the provided criteria.`
    )
    return
  }

  info(
    `Found ${matches} releases matching the pattern. Keeping ${keptReleasesCount} releases and deleting ${releasesToDelete.length} releases.`
  )

  if (dryRun) {
    info("DRY RUN: The following releases and their tags would be deleted:")
    for (const release of releasesToDelete) {
      info(`- Release: ${release.name}, Tag: ${release.tag_name}`)
    }
    return
  }

  await Promise.all(
    releasesToDelete.map(async release => {
      await deleteReleaseAndTag(octokit, release)
    })
  )
}
