import * as core from '@actions/core'
import {context, getOctokit} from '@actions/github'

process.on('unhandledRejection', handleError)
main().catch(handleError)

async function main(): Promise<void> {
  const token = core.getInput('token', {required: true})
  const owner = core.getInput('owner', {required: true})
  const repo = core.getInput('repo', {required: true})

  const github = getOctokit(token)

  try {
    const searchIssues = await github.search.issuesAndPullRequests({
      q: `is:open is:issue mentions:gitstart archived:false repo:${owner}/${repo}`
    })

    const searchCurrentIssues = await github.issues.listForRepo({
      owner: context.repo.owner,
      repo: context.repo.repo,
      state: 'open'
    })

    const issues = searchIssues.data.items
    const currentIssues = searchCurrentIssues.data

    await Promise.all(
      issues.map(async issue => {
        const url = issue.html_url
        console.log('finding issue for: ', url)
        const currentIssue = currentIssues.find(
          issue => issue.body.indexOf(url) !== -1
        )
        const body =
          issue.body + '\n' + 'Duplicates and fixed by ' + issue.html_url
        if (currentIssue) {
          console.log('found issue. updating: ', currentIssue.html_url)
          await github.issues.update({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issue.number,
            body,
            assignee: 'gitstart'
          })
        } else {
          const newIssue = (
            await github.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              body,
              title: issue.title
            })
          ).data
          console.log('created a new issue at: ', newIssue.html_url)
        }
      })
    )

    core.setOutput('result', 'Success')
  } catch (e) {
    console.error(e)
    core.error(JSON.stringify(e))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(err: any): void {
  console.error(err)
  core.setFailed(`Unhandled error: ${err}`)
}
