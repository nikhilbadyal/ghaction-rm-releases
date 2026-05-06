import { getOctokit, context } from "@actions/github"
import type { GitHub } from "@actions/github/lib/utils"
import { info, setFailed, warning } from "@actions/core"
import type { OctokitOptions } from "@octokit/core/types"

export interface Release {
  id: number
  name: string
  tag_name: string
  body: string
  draft: boolean
  prerelease: boolean
  created_at: string
}

export interface ReleaseReference {
  readonly id: number
  readonly name: string
  readonly tag_name: string
}

interface DeleteTagOptions {
  readonly ignoreMissing?: boolean
}

interface ReleaseDeletionResult {
  readonly release: Release
  readonly tagDeleted: boolean
  readonly tagSkipped: boolean
}

export interface RmReleasesSummary {
  readonly matchedCount: number
  readonly keptCount: number
  readonly deleteCount: number
  readonly deletedCount: number
  readonly deletedTagsCount: number
  readonly skippedMissingTagsCount: number
  readonly deleteCandidates: ReleaseReference[]
  readonly deletedReleases: ReleaseReference[]
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
  tagName: string,
  options: DeleteTagOptions = {}
): Promise<boolean> {
  info(`Deleting tag ${tagName}`)
  try {
    await octokit.rest.git.deleteRef({
      ...context.repo,
      ref: `tags/${tagName}`
    })
    return true
  } catch (error) {
    if (options.ignoreMissing && isNotFoundError(error)) {
      // Release cleanup is already complete when the release is gone; a missing tag only means the desired tag state already exists.
      warning(`Tag ${tagName} was already missing, continuing cleanup.`)
      return false
    }

    throw new Error(
      `Unable to delete tag ${tagName}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function deleteReleaseAndTag(
  octokit: InstanceType<typeof GitHub>,
  release: Release,
  deleteTags: boolean
): Promise<ReleaseDeletionResult> {
  await deleteRelease(octokit, release)

  if (!deleteTags) {
    // Some repositories intentionally keep release tags as immutable audit anchors, so release deletion is configurable separately from ref deletion.
    return { release, tagDeleted: false, tagSkipped: false }
  }

  const tagDeleted = await deleteTag(octokit, release.tag_name, {
    ignoreMissing: true
  })

  return { release, tagDeleted, tagSkipped: !tagDeleted }
}

export interface RmReleasesOptions {
  octokit: InstanceType<typeof GitHub>
  releasePattern: string
  releasesToKeep: number
  minReleasesToKeep?: number
  daysToKeep?: number
  excludePattern?: string
  dryRun?: boolean
  deleteTags?: boolean
  deleteDraftReleasesOnly?: boolean
  deletePrereleasesOnly?: boolean
  targetBranchPattern?: string
  maxConcurrency?: number
}

export async function rmReleases({
  octokit,
  releasePattern,
  releasesToKeep,
  minReleasesToKeep = 0,
  daysToKeep,
  excludePattern = "",
  dryRun = false,
  deleteTags = true,
  deleteDraftReleasesOnly = false,
  deletePrereleasesOnly = false,
  targetBranchPattern = "",
  maxConcurrency = 5
}: RmReleasesOptions): Promise<RmReleasesSummary> {
  let releases: Release[] = await getReleases(octokit, releasePattern)

  if (deleteDraftReleasesOnly) {
    releases = releases.filter(release => release.draft)
  }

  if (deletePrereleasesOnly) {
    releases = releases.filter(release => release.prerelease)
  }

  if (targetBranchPattern) {
    const targetBranchRegex = new RegExp(targetBranchPattern)
    const releasesWithBranches = await runWithConcurrency(
      releases,
      maxConcurrency,
      async release => {
        const branchNames = await getReleaseHeadBranches(octokit, release)
        return { branchNames, release }
      }
    )
    releases = releasesWithBranches
      .filter(({ branchNames }) =>
        branchNames.some(branchName => targetBranchRegex.test(branchName))
      )
      .map(({ release }) => release)
  }

  if (excludePattern) {
    const excludeRegex = new RegExp(excludePattern)
    releases = releases.filter(release => !excludeRegex.test(release.tag_name))
  }

  const releasesToDelete: Release[] = []
  const now = new Date()
  const effectiveReleasesToKeep = Math.max(releasesToKeep, minReleasesToKeep)

  for (let i = 0; i < releases.length; i++) {
    const release = releases[i]
    const releaseDate = new Date(release.created_at)
    const ageInDays =
      (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24)

    const shouldKeepByCount = i < effectiveReleasesToKeep
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
    return {
      deleteCandidates: [],
      deleteCount: 0,
      deletedCount: 0,
      deletedReleases: [],
      deletedTagsCount: 0,
      keptCount: keptReleasesCount,
      matchedCount: matches,
      skippedMissingTagsCount: 0
    }
  }

  info(
    `Found ${matches} releases matching the pattern. Keeping ${keptReleasesCount} releases and deleting ${releasesToDelete.length} releases.`
  )

  if (dryRun) {
    info("DRY RUN: The following releases and their tags would be deleted:")
    for (const release of releasesToDelete) {
      info(`- Release: ${release.name}, Tag: ${release.tag_name}`)
    }
    return {
      deleteCandidates: releasesToDelete.map(toReleaseReference),
      deleteCount: releasesToDelete.length,
      deletedCount: 0,
      deletedReleases: [],
      deletedTagsCount: 0,
      keptCount: keptReleasesCount,
      matchedCount: matches,
      skippedMissingTagsCount: 0
    }
  }

  const deletionResults = await runWithConcurrency(
    releasesToDelete,
    maxConcurrency,
    async release => deleteReleaseAndTag(octokit, release, deleteTags)
  )

  return {
    deleteCandidates: releasesToDelete.map(toReleaseReference),
    deleteCount: releasesToDelete.length,
    deletedCount: deletionResults.length,
    deletedReleases: deletionResults.map(result =>
      toReleaseReference(result.release)
    ),
    deletedTagsCount: deletionResults.filter(result => result.tagDeleted)
      .length,
    keptCount: keptReleasesCount,
    matchedCount: matches,
    skippedMissingTagsCount: deletionResults.filter(result => result.tagSkipped)
      .length
  }
}

async function getReleaseCommitSha(
  octokit: InstanceType<typeof GitHub>,
  release: Release
): Promise<string | undefined> {
  const { data: tagRef } = await octokit.rest.git.getRef({
    ...context.repo,
    ref: `tags/${release.tag_name}`
  })

  if (tagRef.object.type === "commit") {
    return tagRef.object.sha
  }

  if (tagRef.object.type !== "tag") {
    // Branch filtering only has a documented commit endpoint, so non-commit tag targets cannot safely match a branch.
    info(
      `Tag ${release.tag_name} points to ${tagRef.object.type}, not a commit. Skipping branch match.`
    )
    return undefined
  }

  const { data: annotatedTag } = await octokit.rest.git.getTag({
    ...context.repo,
    tag_sha: tagRef.object.sha
  })

  if (annotatedTag.object.type !== "commit") {
    // Annotated release tags normally point to commits; keep unusual objects out of deletion instead of guessing.
    info(
      `Annotated tag ${release.tag_name} points to ${annotatedTag.object.type}, not a commit. Skipping branch match.`
    )
    return undefined
  }

  return annotatedTag.object.sha
}

async function getReleaseHeadBranches(
  octokit: InstanceType<typeof GitHub>,
  release: Release
): Promise<string[]> {
  try {
    const commitSha = await getReleaseCommitSha(octokit, release)
    if (!commitSha) {
      return []
    }

    const { data: branches } =
      await octokit.rest.repos.listBranchesForHeadCommit({
        ...context.repo,
        commit_sha: commitSha
      })

    return branches.map(branch => branch.name)
  } catch (error) {
    info(
      `Could not fetch target branches for release ${release.tag_name}: ${error instanceof Error ? error.message : String(error)}`
    )
    return []
  }
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  )
}

function toReleaseReference(release: Release): ReleaseReference {
  return {
    id: release.id,
    name: release.name,
    tag_name: release.tag_name
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  maxConcurrency: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  let nextIndex = 0
  const workerCount = Math.min(Math.max(maxConcurrency, 1), items.length)

  // A tiny worker pool avoids unbounded GitHub API fan-out while preserving the fail-fast behavior callers already expect.
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex
        nextIndex += 1
        results[currentIndex] = await task(items[currentIndex])
      }
    })
  )

  return results
}
