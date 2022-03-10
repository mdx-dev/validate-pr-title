// @ts-check
const core = require("@actions/core");
const github = require("@actions/github");

async function main() {
  try {
    const token = core.getInput("github-token", { required: true });
    const jiraUrl = core.getInput("jira-url", { required: true });
    const matchAndExtractRegexpString = core.getInput(
      "match-and-extract-regexp-string",
      { required: true }
    );
    // NOTE: This will be required if update-description-with-link is true, so we check for this further down
    const capturingGroupContainingId = core.getInput(
      "capturing-group-containing-id",
      { required: false }
    );
    const updateDescriptionWithLink = core.getInput(
      "update-description-with-link",
      { required: true }
    );
    const context = github.context;
    const octokit = github.getOctokit(token, {
      previews: ["ant-man-preview", "flash-preview"],
    });

    const title = context.payload.pull_request.title;

    const re = new RegExp(matchAndExtractRegexpString);
    if (!re.test(title)) {
      core.setFailed(
        `\nFail: PR Title "${title}" did not match the configured regexp "${matchAndExtractRegexpString}"`
      );
      return;
    }

    core.info(
      `\nPR Title "${title}" matched the configured regexp "${matchAndExtractRegexpString}"`
    );

    if (updateDescriptionWithLink !== "true") {
      core.info(
        `\nSkipping updating the PR description with a link to the JIRA issue, because "update-description-with-link" is not set to true`
      );
      return;
    }

    // Given updateDescriptionWithLink is true at this point, capturing-group-containing-id is now required
    if (!capturingGroupContainingId) {
      core.setFailed(
        `\nConfiguration Error: "capturing-group-containing-id" is required if "update-description-with-link" is set to true (which is the default)`
      );
      return;
    }

    core.info("\nExtracting Jira issue from PR title");

    const capturingGroupContainingIdNum = Number(capturingGroupContainingId);

    const result = re.exec(title);
    if (!result || !result[capturingGroupContainingIdNum]) {
      core.setFailed(
        `\nConfiguration Error: Could not extract Jira issue from PR Title "${title}", ensure that the provided "capturing-group-containing-id" is correct`
      );
      return;
    }

    const fullJiraUrl = `${jiraUrl}/browse/${result[capturingGroupContainingIdNum]}`;

    const { data } = await octokit.rest.pulls.get({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
    });

    if (data.body.includes(fullJiraUrl)) {
      core.info(
        "\nPR description already contains the derived Jira link, no further action required"
      );
      return;
    }

    // If we got to this point there is either no existing jira link, or the link has changed
    const markerComment = "<!-- automated-jira-link-start -->";

    if (data.body.includes(markerComment)) {
      core.info(
        "\nExisting jira link found which differs from the latest derived one, updating the PR description..."
      );
      const [bodyWithoutJiraLink] = data.body.split(markerComment);
      data.body = bodyWithoutJiraLink;
    }

    await octokit.rest.pulls.update({
      ...context.repo,
      pull_number: data.number,
      body: `${data.body}

${markerComment}
---

**Update from :robot:** 

Jira ticket link extracted from PR title: [${fullJiraUrl}](${fullJiraUrl})
`,
    });

    core.info("\nUpdated PR description with latest derived Jira link");
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

main();
