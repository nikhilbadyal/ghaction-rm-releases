## About

A GitHub action to remove older releases with their tags based on a regex pattern. This action provides flexible filtering options to keep releases based on recency, age, or exclusion patterns.

**Key Features:**

- 🎯 **Pattern-based filtering** - Use regex to target specific releases
- 📅 **Age-based retention** - Keep releases newer than X days
- 🔢 **Count-based retention** - Keep the N most recent releases
- 🚫 **Exclusion patterns** - Protect specific releases from deletion
- 🔗 **Tag cleanup** - Automatically removes associated Git tags
- ⚡ **Parallel processing** - Fast deletion of multiple releases

---

- [Usage](#usage)
- [Inputs](#inputs)
- [Input Interactions](#input-interactions)
- [Examples](#examples)
- [Permissions](#permissions)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)

## Usage

To use the action, add following to your workflow file

```yaml
- name: Delete Older Releases
  uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
    RELEASE_PATTERN: "Build*"
    RELEASES_TO_KEEP: 5 # Optional: Keep the 5 most recent releases matching the pattern
```

## Inputs

Following inputs can be used as `step.with` keys

| Name                         | Type    | Required | Default | Description                                                                                                      |
| ---------------------------- | ------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`               | String  | ✅ Yes   |         | [GitHub Token](https://github.com/settings/tokens) with `contents:write` permissions to delete releases and tags |
| `RELEASE_PATTERN`            | String  | ✅ Yes   |         | Regular expression pattern to match release tag names for deletion (e.g., `"^v1\\..*"` for all v1.x releases)    |
| `RELEASES_TO_KEEP`           | Number  | ❌ No    | `0`     | Number of most recent matching releases to keep (sorted by creation date). `0` means don't keep any by count     |
| `EXCLUDE_PATTERN`            | String  | ❌ No    | `""`    | Regular expression pattern to exclude releases from deletion (e.g., `".*-stable$"` to exclude stable releases)   |
| `DAYS_TO_KEEP`               | Number  | ❌ No    | `0`     | Number of days to keep releases. Releases newer than this will be preserved. `0` means don't keep any by age     |
| `DRY_RUN`                    | Boolean | ❌ No    | `false` | If `true`, the action will list the releases to be deleted without actually deleting them. Useful for testing.   |
| `DELETE_DRAFT_RELEASES_ONLY` | Boolean | ❌ No    | `false` | If `true`, only draft releases will be considered for deletion. This filter is applied before `RELEASE_PATTERN`. |
| `DELETE_PRERELEASES_ONLY`    | Boolean | ❌ No    | `false` | If `true`, only prereleases will be considered for deletion. This filter is applied before `RELEASE_PATTERN`.    |

### Input Validation

- `RELEASES_TO_KEEP` and `DAYS_TO_KEEP` must be non-negative integers
- `RELEASE_PATTERN` and `EXCLUDE_PATTERN` must be valid regular expressions
- Empty `RELEASE_PATTERN` will result in no releases being processed
- Invalid regex patterns will cause the action to fail with a descriptive error

## Input Interactions

### How the Action Works

The action follows this logic sequence:

1. **Draft Release Filtering**: If `DELETE_DRAFT_RELEASES_ONLY` is `true`, filter to include only draft releases.
2. **Prerelease Filtering**: If `DELETE_PRERELEASES_ONLY` is `true`, filter to include only prereleases.
3. **Pattern Matching**: Fetch all releases and filter by `RELEASE_PATTERN`
4. **Exclusion Filtering**: Remove releases matching `EXCLUDE_PATTERN` (if provided)
5. **Sort by Date**: Sort remaining releases by creation date (newest first)
6. **Preservation Logic**: For each release, keep it if **either** condition is true:
   - **Count-based**: Release is within the `RELEASES_TO_KEEP` most recent releases
   - **Age-based**: Release is newer than `DAYS_TO_KEEP` days old
7. **Deletion**: Delete releases and their associated tags that don't meet either preservation criteria

### Key Points

- **Draft-Only Filtering**: If `DELETE_DRAFT_RELEASES_ONLY` is `true`, the action will exclusively target draft releases, ignoring published releases. This filter is applied at the very beginning of the process.
- **Prerelease-Only Filtering**: If `DELETE_PRERELEASES_ONLY` is `true`, the action will exclusively target prereleases, ignoring stable releases. This filter is applied at the very beginning of the process.
- **OR Logic**: `RELEASES_TO_KEEP` and `DAYS_TO_KEEP` work with OR logic - a release is kept if it meets _either_ criteria
- **Exclusion Priority**: `EXCLUDE_PATTERN` is applied first, so excluded releases are never deleted regardless of other settings
- **Date Handling**: Invalid or missing creation dates are treated as very old (will be deleted unless kept by count)
- **Zero Values**: Setting `RELEASES_TO_KEEP=0` or `DAYS_TO_KEEP=0` disables that specific preservation method
- **Tag Cleanup**: When a release is deleted, its associated Git tag is also removed
- **Atomic Operations**: Each release and tag deletion is performed as a separate API call for reliability

## Examples

### Basic Usage - Delete All Matching Releases

```yaml
- uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    RELEASE_PATTERN: "^beta-.*" # Delete all beta releases
```

### Delete Only Draft Releases

```yaml
- uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    RELEASE_PATTERN: ".*" # Match all releases (drafts will be filtered by DELETE_DRAFT_RELEASES_ONLY)
    DELETE_DRAFT_RELEASES_ONLY: true # Only target draft releases for deletion
```

### Dry Run - See What Would Be Deleted

```yaml
- uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    RELEASE_PATTERN: ".*" # Match all releases
    DRY_RUN: true # List releases to be deleted without actually deleting them
```

### Keep Recent Releases by Count

```yaml
- uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    RELEASE_PATTERN: "^v[0-9]+\\.[0-9]+\\.[0-9]+$" # Match semantic versions
    RELEASES_TO_KEEP: 3 # Keep the 3 most recent versions
```

### Keep Recent Releases by Age

```yaml
- uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    RELEASE_PATTERN: ".*" # Match all releases
    DAYS_TO_KEEP: 30 # Keep releases from the last 30 days
```

### Combined Count and Age Preservation

```yaml
- uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    RELEASE_PATTERN: "^v.*"
    RELEASES_TO_KEEP: 2 # Keep 2 most recent releases
    DAYS_TO_KEEP: 90 # AND/OR keep releases from last 90 days
    # A release is kept if it's either in the top 2 recent OR newer than 90 days
```

### Exclude Specific Releases

```yaml
- uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    RELEASE_PATTERN: "^v.*"
    EXCLUDE_PATTERN: ".*-stable$" # Never delete releases ending with '-stable'
    RELEASES_TO_KEEP: 5
```

```yaml
- name: Delete Older Releases
  uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
    RELEASE_PATTERN: "Build*"
    RELEASES_TO_KEEP: 5 # Optional: Keep the 5 most recent releases matching the pattern
```

### Delete Only Prereleases

```yaml
- uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    RELEASE_PATTERN: ".*" # Match all releases (prereleases will be filtered by DELETE_PRERELEASES_ONLY)
    DELETE_PRERELEASES_ONLY: true # Only target prereleases for deletion
```

### Complex Cleanup Strategy

```yaml
- uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    RELEASE_PATTERN: "^(dev|test|staging)-.*" # Target dev/test/staging releases
    EXCLUDE_PATTERN: ".*(important|milestone).*" # Protect important releases
    RELEASES_TO_KEEP: 10 # Keep 10 most recent matching releases
    DAYS_TO_KEEP: 7 # Also keep any from the last week
```

## Permissions

### Required GitHub Token Permissions

The GitHub token must have the following permissions:

- **`contents: write`** - Required to delete releases and tags
- **`metadata: read`** - Required to read repository information

### Token Setup Options

#### Option 1: Use GITHUB_TOKEN (Recommended)

```yaml
- uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    # ... other inputs
```

#### Option 2: Use Personal Access Token

If you need to run this action on a different repository or need additional permissions:

1. Create a [Personal Access Token](https://github.com/settings/tokens) with `repo` scope
2. Add it as a repository secret (e.g., `GH_TOKEN`)
3. Use it in your workflow:

```yaml
- uses: nikhilbadyal/ghaction-rm-releases@v0.6.0
  with:
    GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
    # ... other inputs
```

## Error Handling

The action provides detailed error messages for common issues:

### Common Errors and Solutions

| Error Message                                     | Cause                                             | Solution                                        |
| ------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| `Need Github Token`                               | Missing or empty `GITHUB_TOKEN`                   | Ensure `GITHUB_TOKEN` is provided and not empty |
| `RELEASES_TO_KEEP must be a non-negative integer` | Invalid `RELEASES_TO_KEEP` value                  | Use a non-negative integer (0, 1, 2, etc.)      |
| `DAYS_TO_KEEP must be a non-negative integer`     | Invalid `DAYS_TO_KEEP` value                      | Use a non-negative integer (0, 1, 2, etc.)      |
| `Unable to list release`                          | API error or permissions issue                    | Check token permissions and repository access   |
| `Unable to delete release`                        | Insufficient permissions or release doesn't exist | Verify `contents:write` permission              |
| `Unable to delete tag`                            | Insufficient permissions or tag doesn't exist     | Verify `contents:write` permission              |
| Invalid regular expression                        | Malformed regex in patterns                       | Test regex patterns before using                |

### Dry Run / Testing

To test your configuration without actually deleting releases:

1. Fork your repository
2. Run the action on the fork first
3. Verify the behavior matches your expectations
4. Then apply to your main repository

## Troubleshooting

### No Releases Found

- Verify your `RELEASE_PATTERN` matches existing release tag names
- Check that releases exist in the repository
- Ensure the pattern is a valid regular expression

### Unexpected Deletions

- Review the [Input Interactions](#input-interactions) section
- Remember that `RELEASES_TO_KEEP` and `DAYS_TO_KEEP` use OR logic
- Check if `EXCLUDE_PATTERN` is working as expected

### Permission Errors

- Verify the token has `contents:write` permission
- For organization repositories, check if additional permissions are required
- Ensure the token hasn't expired

### Regex Pattern Help

- Test your regex patterns using online tools like [regex101.com](https://regex101.com)
- Remember to escape special characters in YAML strings
- Use double quotes for regex patterns in YAML

### Performance Considerations

- The action processes releases in parallel for better performance
- Large numbers of releases (100+) may take longer to process
- API rate limits may apply for repositories with many releases

## Contributing

Want to contribute? Awesome! The most basic way to show your support is to star the project, or to raise issues.

Thanks again for your support, it is much appreciated!
