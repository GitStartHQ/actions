import * as core from '@actions/core'
import {execSync} from 'child_process'

process.on('unhandledRejection', handleError)
main().catch(handleError)

type ActionProps = {
  image: string
  awsAccountId: string
  awsRegion: string
  ecrRepository: string
}

enum ActionTypes {
  pull = 'pull',
  push = 'push'
}

function runProcess(cmd: string) {
  const AWS_ACCESS_KEY_ID = core.getInput('access-key-id', {required: true})
  const AWS_SECRET_ACCESS_KEY = core.getInput('secret-access-key', {
    required: true
  })

  return execSync(cmd, {
    shell: '/bin/bash',
    encoding: 'utf-8',
    env: {
      ...process.env,
      AWS_PAGER: '', // Disable the pager.
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY
    }
  })
}

type ActionTypeMappers = {
  trigger: (opts: ActionProps) => void
}

const ecrActionMappers: {[type in ActionTypes]: ActionTypeMappers} = {
  [ActionTypes.push]: {
    trigger: ({image, awsAccountId, awsRegion, ecrRepository}) => {
      console.log(
        `Pushing image ${image} to ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${ecrRepository}/${image}`
      )
      runProcess(
        `docker tag ${image} ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${ecrRepository}/${image}`
      )
      runProcess(
        `docker push ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${ecrRepository}/${image}`
      )
    }
  },
  [ActionTypes.pull]: {
    trigger: ({image, awsAccountId, awsRegion, ecrRepository}) => {
      console.log(
        `Pulling ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${ecrRepository}/${image} to ${image}`
      )
      runProcess(
        `docker pull ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${ecrRepository}/${image}`
      )
      runProcess(
        `docker tag ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${ecrRepository}/${image} ${image}`
      )
    }
  }
}

async function main() {
  try {
    const image = core.getInput('image', {required: true})
    const awsRegion = core.getInput('region') ?? 'us-west-2'
    const ecrRepository = core.getInput('repository', {required: true})
    const type = (core.getInput('type') ?? ActionTypes.push) as ActionTypes

    const accountLoginPassword = `aws ecr get-login-password --region ${awsRegion}`
    const accountData = runProcess(
      `aws sts get-caller-identity --output json --region ${awsRegion}`
    )
    const awsAccountId = JSON.parse(accountData).Account
    const imageUrl = `https://${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${image}`
    core.setOutput('imageUrl', imageUrl)

    runProcess(
      `${accountLoginPassword} | docker login --username AWS --password-stdin ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com`
    )

    if (!ecrActionMappers[type]) {
      throw new Error(`Unknown action: ${type}`)
    }
    return ecrActionMappers[type].trigger({
      image,
      awsRegion,
      awsAccountId,
      ecrRepository
    })
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
