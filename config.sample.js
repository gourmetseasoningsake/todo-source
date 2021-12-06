export default {
  // https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
  PAT: "<personal access token>",

  // https://github.com/octokit/octokit.js#constructor-options
  USER_AGENT: "todo/v0.1.0", // example
  TIMEZONE: "Europe/Berlin", // example

  // as in https://github.com/<owner>/<repo>
  REPO: "<repo>",

  // project number as in https://github.com/<owner>/<repo>/projects/<project number>
  PROJECT_NUMBER: 1, // example

  // the title of the project column where new issues should be dropped
  TODO_COLUMN_NAME: "Todo" // example
}