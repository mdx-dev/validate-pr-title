# validate-pr-title

A Github Action which validates a PR title against a given regexp and optionally extracts the Jira ID and appends it to the PR's description.

## Example Usage

**.github/workflows/validate-pr-title.yml**

<!-- start example-usage -->

```yaml
name: 'Validate PR Title'

on:
  pull_request:
    types:
      - opened
      - edited
      # Check title when new commits are pushed.
      # Required to use as a status check.
      - synchronize

concurrency:
  group: ${{ github.workflow }}-${{ github.event.number || github.ref }}
  cancel-in-progress: true

jobs:
  validate_pr_title:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - uses: mdx-dev/validate-pr-title@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          jira-url: https://acme.atlassian.net
          match-and-extract-regexp-string: '^(feat|fix|chore|docs)(\(((FOO|BAR)-\d+)\))?:\s.+$'
          capturing-group-containing-id: 3
```

<!-- end example-usage -->
