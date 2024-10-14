// imports
const dotenv = require('dotenv')
const dotEnvConfig = dotenv.config({ path: 'init.env' })
if (dotEnvConfig.error != null) {
  throw dotEnvConfig.error
}

const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const rl = require('readline')

// helpers functions
function replaceInFiles (directory, templates, ignoreFiles) {
  const files = getAllFiles(directory, ignoreFiles)

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (ignoreFiles.some(f => file.toLowerCase().endsWith(f.toLowerCase()))) {
      // ignore
      continue
    }

    replaceInFile(file, templates)
  }
}

function getAllFiles (directory) {
  let filesList = []

  function readDirectory(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)
      if (fullPath.includes('node_modules')) {
        continue
      }

      if (entry.isDirectory()) {
        readDirectory(fullPath)
      } else {
        filesList.push(fullPath)
      }
    }
  }

  readDirectory(directory)
  return filesList
}

function replaceInFile (filePath, templates) {
  const data = fs.readFileSync(filePath).toString('utf-8')

  let newData = data
  for (const searchString of Object.keys(templates)) {
    const replaceString = templates[searchString]
    newData = newData.replace(new RegExp(searchString, 'g'), replaceString)
  }

  if (data !== newData) {
    fs.writeFileSync(filePath, newData);
  }
}

async function createLocalDatabase (name) {
  const connection = await mysql.createConnection({
      host: 'localhost',
      user: process.env.DB_LOCAL_USERNAME,
      password: process.env.DB_LOCAL_PASSWORD,
  })

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${name}\`;`)
  await connection.end();
}

async function promptInput (text) {
  const readline = rl.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve => {
    readline.question(text.endsWith(' ') ? text : text + ' ', res => {
      readline.close()
      resolve(res)
    })
  })
}


async function main () {
  console.log('Initialising...')

  // copy the template env files
  fs.copyFileSync('./projects/server/template.env', './projects/server/local.env')
  fs.copyFileSync('./projects/server/template.env', './projects/server/test.env')
  replaceInFile('./projects/server/test.env', { DB_NAME_LOCAL: 'DB_TEST_NAME_LOCAL' }) // make sure we create a valid test env file
  fs.copyFileSync('./projects/studio/template.env', './projects/studio/.env')

  // replace strings. each environment variable corresponds to a string template to replace, given by `INIT__${envVariable}`.
  console.log('Replacing string templates...')
  let templates = {}
  for (const variable of Object.keys(dotEnvConfig.parsed)) {
    templates[`INIT__${variable}`] = dotEnvConfig.parsed[variable]
  }
  replaceInFiles('.', templates, ['init.env', 'init.js', 'yarn.lock'])

  // create the local databases
  console.log('Creating local database schemas...')
  await createLocalDatabase(process.env.DB_NAME_LOCAL)
  await createLocalDatabase(process.env.DB_TEST_NAME_LOCAL)

  // run tests
  console.log('Testing code...')
  execSync('yarn workspace server test:db', { stdio: 'ignore' })
  execSync('yarn workspace server test', { stdio: 'ignore' })
  execSync('yarn workspace shared test', { stdio: 'ignore' })

  // apply migration and seed db
  console.log('Applying migrations...')
  execSync('yarn workspace server cross-env NODE_ENV=local dotenv -e local.env prisma migrate dev', { stdio: 'ignore' })

  // seed database
  console.log('Seeding database...')
  let username = await promptInput(`Enter the admin user's username (default: "admin")`).then(str => str.toLowerCase().trim())
  if (username === '') {
    username = 'admin'
  }
  
  let password = await promptInput(`Enter the admin user's password (default: "admin")`)
  if (password.trim() === '') {
    password = 'admin'
  }

  const localEnv = dotenv.config({ path: './projects/server/local.env' })
  const prisma = new PrismaClient({ datasources: { db: { url: localEnv.parsed.DATABASE_URL }} })
  const rank = await prisma.rank.create({ data: {
    name: 'admin',
    description: 'System admin'
  }})
  const user = await prisma.user.create({ data: {
    username: username,
    hashedPassword: crypto.createHash('sha256').update(username + password).digest('hex')
  }})
  await prisma.userRank.create({ data: {
    issuedAt: new Date(),
    userId: user.id,
    rankId: rank.id
  }})

  // print next steps
  console.log('Done!')
  console.log('Get started by running the following commands in separate terminals:')
  console.log('> yarn workspace server watch:check')
  console.log('> yarn workspace server start:local')
  console.log('> yarn workspace studio start')
}

main()
