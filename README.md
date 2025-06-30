## About

A GitHub action to remove older releases with their tags.

---

- [Usage](#usage)
- [Inputs](#inputs)

## Usage

To use the action, add following to your workflow file

```yaml
- name: Delete Older Releases
  uses: nikhilbadyal/ghaction-rm-releases@v0.2.0
  with:
    GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
    RELEASE_PATTERN: "Build*"
    RELEASES_TO_KEEP: 5 # Optional: Keep the 5 most recent releases matching the pattern
```

## Inputs

Following inputs can be used as `step.with` keys

| Name               | Type   | Default | Description                                                                                                              |
| ------------------ | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GITHUB_TOKEN`     | String |         | [Github Token](https://github.com/settings/tokens) to delete releases (**required**)                                     |
| `RELEASE_PATTERN`  | String |         | Pattern to delete from release (**required**)                                                                            |
| `RELEASES_TO_KEEP` | Number | `0`     | Number of most recent releases to keep after filtering by RELEASE_PATTERN. Defaults to 0 (delete all matching releases). |
| `EXCLUDE_PATTERN`  | String | `""`    | Pattern to exclude from release deletion (optional).                                                                     |

## Contributing

Want to contribute? Awesome! The most basic way to show your support is to star the project, or to raise issues.

Thanks again for your support, it is much appreciated! :pray:
