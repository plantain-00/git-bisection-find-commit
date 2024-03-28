import minimist from 'minimist'
import inquirer from 'inquirer'
import childProcess from 'child_process'
import * as packageJson from '../package.json'

function showToolVersion() {
  console.log(`Version: ${packageJson.version}`)
}

function showHelp() {
  console.log(`Version ${packageJson.version}
Syntax:   git-bisection-find-commit [options]
Examples: git-bisection-find-commit
Options:
 -h, --help                                         Print this message.
 -v, --version                                      Print the version
`)
}

async function executeCommandLine() {
  const argv = minimist(process.argv.slice(2), { '--': true }) as unknown as {
    v?: unknown
    version?: unknown
    h?: unknown
    help?: unknown
  }

  const showVersion = argv.v || argv.version
  if (showVersion) {
    showToolVersion()
    return
  }

  if (argv.h || argv.help) {
    showHelp()
    return
  }

  const correctCommitAnswer = await inquirer.prompt<{ correctCommit: string }>({
    type: 'input',
    name: 'correctCommit',
    message: 'Enter a correct commit:',
  })

  const logCommand = correctCommitAnswer.correctCommit ? `git log ${correctCommitAnswer.correctCommit}..HEAD` : 'git log'
  const lines = childProcess.execSync(logCommand).toString().split('\n\n')
  const commits: { message: string, hash: string, author: string, date: string }[] = []
  for (let i = 0; i < lines.length; i += 2) {
    const headers = lines[i].split('\n')
    const message = lines[i + 1].trim().split('\n')[0]
    const hash = headers[0].substring('commit'.length).trim()
    const author = headers[1].substring('Author:'.length).trim()
    const date = headers[2].substring('Date:'.length).trim()
    commits.push({ message, hash, date, author })
  }
  let wrongIndex = 0
  let correctIndex = commits.length
  while (wrongIndex < correctIndex) {
    if (wrongIndex + 1 === correctIndex) {
      const commit = commits[wrongIndex]
      console.info(`The commit that breaks your code is: ${wrongIndex} ${commit.hash} at ${commit.date} by ${commit.author} ${commit.message}`)
      break
    }
    const middle = Math.floor((wrongIndex + correctIndex) / 2)
    const commit = commits[middle]
    console.info(`git checkout ${middle}(${wrongIndex}~${correctIndex - 1}) ${commit.hash} at ${commit.date} by ${commit.author} ${commit.message}`)
    childProcess.execSync(`git checkout ${commit.hash}`)

    const correctAnswer = await inquirer.prompt<{ correct: boolean }>({
      type: 'confirm',
      name: 'correct',
      message: `Is current commit ${middle}(${wrongIndex}~${correctIndex - 1}) correct?`,
    })
    if (correctAnswer.correct) {
      correctIndex = middle
    } else {
      wrongIndex = middle
    }
  }
}

executeCommandLine().then(() => {
  console.log(`git-bisection-find-commit success.`)
}, (error: unknown) => {
  if (error instanceof Error) {
    console.log(error.message)
  } else {
    console.log(error)
  }
  process.exit(1)
})
