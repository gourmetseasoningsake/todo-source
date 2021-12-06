import config from "./config.js"
import { parse } from "https://deno.land/std@0.117.0/flags/mod.ts"
import { Octokit } from "https://cdn.skypack.dev/octokit?dts"



// Commands

const args = parse(Deno.args, {
  string: ["title", "body", "view", "done"],
  boolean: ["help", "list"],
  alias: {
    h: "help",
    t: "title",
    b: "body",
    l: "list",
    v: "view",
    d: "done"
  },
  unknown: () => false
})



if (args.help || Deno.args.length < 1) {
  console.log(`
Dumb todo list.

Options:
  -h, --help            Show help                           [boolean]
  -t, --title <title>   Create new todo with title           [string]
  -b, --body <body>     Add body when creating a new todo    [string]
  -l, --list            List open todos                     [boolean]
  -v, --view <number>   Show todo details                    [string]
  -d, --done <number>   Close a todo                         [string]
`)

  Deno.exit(0)
}



/*
 * Login
 */

const octokit = new Octokit({ 
  auth: config.PAT,
  userAgent: config.USER_AGENT,
  timeZone: config.TIMEZONE
})



const { data } = await octokit.rest.users.getAuthenticated()



console.log("TODO %c(%s)", "font-style: italic; color: gray", data.login)



/*
 * Command execution
 */

if (args.title) {
  todoCreate({ title: args.title, body: args.body })
  .then(([_, issue]) => {
    console.log(
      "%c%s\n%c%d %c%s", 
      "font-style: italic; color: gray", "CREATED:",
      "color: green", issue.number, 
      "color: lightgreen", issue.title
    )
  })
  .catch(console.log)

} else if (args.list) {
  issueList()
  .then(data => data.forEach(issue => {
    console.log(
      "%c%d %c%s%c%s",
      "color: green", issue.number,
      "color: lightgreen", issue.title,
      "font-style: italic; color: green", (issue.body ? " ..." : "")
    )
  }))
  .catch(console.log)

} else if (args.view) {
  issueGet(args.view)
  .then(issue => {
    console.log(
      "%c%d %c%s\n%c%s",
      "color: green", issue.number,
      "color: lightgreen", issue.title,
      "", issue.body
    )
  })
  .catch(console.log)

} else if (args.done) {
  issueUpdate({ number: args.done }, { state: "closed" })
  .then(issue => {
    console.log(
      "%c%s\n%c%d %c%s", 
      "font-style: italic; color: gray", "DONE:",
      "color: green", issue.number,
      "color: lightgreen", issue.title
    )
  })
  .catch(console.log)
}



/*
 * Todo
 */

// create

function todoCreate ({ 
  title, 
  body = "",
  projectNumber = config.PROJECT_NUMBER,
  columnName = config.TODO_COLUMN_NAME }) {
  return (
    projectGet(projectNumber)
    .then(project => Promise.all([
      columnGet({ name: columnName, projectId: project.id }),
      issueCreate({ title, body })
    ]))
    .then(([column, issue]) => Promise.all([
      cardCreate({ columnId: column.id, contentId: issue.id }),
      issue
    ]))
  )
}



/* 
 * Issue
 */

// create
// https://docs.github.com/en/rest/reference/issues#create-an-issue

function issueCreate ({ title, body = "" }) {
  return octokit.request('POST /repos/{owner}/{repo}/issues', {
    owner: data.login,
    repo: config.REPO,
    title: title,
    body: body
  })
  .then(getData)
}



// list
// https://docs.github.com/en/rest/reference/issues#list-repository-issues

function issueList () {
  return octokit.request('GET /repos/{owner}/{repo}/issues', {
    owner: data.login,
    repo: config.REPO
  })
  .then(getData)
}



// get
// https://docs.github.com/en/rest/reference/issues#get-an-issue

function issueGet (number) {
  return octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
    owner: data.login,
    repo: config.REPO,
    issue_number: number
  })
  .then(getData)
}



// update
// https://docs.github.com/en/rest/reference/issues#update-an-issue

function issueUpdate ({ number }, options = {}) {
  return octokit.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
    owner: data.login,
    repo: config.REPO,
    issue_number: number,
    ...options
  })
  .then(getData)
}



/* 
 * Project 
 */

// get
// https://docs.github.com/en/rest/reference/projects#get-a-project

function projectGet (number) {
  return octokit.request('GET /repos/{owner}/{repo}/projects', {
    owner: data.login,
    repo: config.REPO
  })
  .then(getData)
  .then(xs => xs.reduce((a, b) => b.number === number ? b : a, {}))
}



/* 
 * Column 
 */

// get
// https://docs.github.com/en/rest/reference/projects#get-a-project

function columnGet ({ name, projectId }) {
  return octokit.request('GET /projects/{project_id}/columns', {
    project_id: projectId
  })
  .then(getData)
  .then(xs => xs.reduce((a, b) => b.name === name ? b : a, {}))
}



/* 
 * Card
 */

// create
// https://docs.github.com/en/rest/reference/projects#create-a-project-card

function cardCreate ({ columnId, contentId, contentType = "Issue" }) {
  return octokit.request('POST /projects/columns/{column_id}/cards', {
    column_id: columnId,
    content_id: contentId,
    content_type: contentType
  })
  .then(getData)
}



/* 
 * Helpers 
 */

function getData (resp) {
  if (resp.status === 200 || resp.status === 201) {
    return resp.data
  }
  throw new Error("Request failed", { cause: resp })
}

