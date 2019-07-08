import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { copy, ensureDir, ensureSymlink, readFile, remove, writeFile, writeJson } from 'fs-extra'
import spawn from 'child-process-ext/spawn'
import fetch from 'node-fetch'
import tar from 'tar'
import { memoize } from 'lodash'

const tmpDir = os.tmpdir()

const SERVERLESS_PLATFORM_STAGE = process.env.SERVERLESS_PLATFORM_STAGE || 'dev'

const retrieveServerless = memoize(async () => {
  const serverlessTmpDir = path.join(
    tmpDir,
    `serverless-enterprise-plugin-test-serverless-${crypto.randomBytes(2).toString('hex')}`
  )
  console.info(`Setup 'serverless' at ${serverlessTmpDir}`)
  const servelressDirDeferred = ensureDir(serverlessTmpDir)
  console.info('... fetch metadata')
  const metaData = await (await fetch('https://registry.npmjs.org/serverless')).json()

  await servelressDirDeferred
  console.info('... fetch tarball')
  const res = await fetch(metaData.versions[metaData['dist-tags'].latest].dist.tarball)
  const tarDeferred = tar.x({ cwd: serverlessTmpDir, strip: 1 })
  res.body.pipe(tarDeferred)
  await new Promise((resolve, reject) => {
    res.body.on('error', reject)
    tarDeferred.on('error', reject)
    tarDeferred.on('finish', resolve)
  })

  console.info('... strip @serverless/enterprise-plugin dependency')
  const pkgJsonPath = `${serverlessTmpDir}/package.json`
  const pkgJson = require(pkgJsonPath)
  delete pkgJson.dependencies['@serverless/enterprise-plugin']
  await writeJson(pkgJsonPath, pkgJson)

  console.info('... npm install')
  await spawn('npm', ['install', '--production'], { cwd: serverlessTmpDir })
  console.info('... symlink local @serverless/enterprise-plugin into dependencies')
  await ensureSymlink(
    path.join(__dirname, '..'),
    path.join(serverlessTmpDir, 'node_modules/@serverless/enterprise-plugin')
  )

  return path.join(serverlessTmpDir, 'bin/serverless')
})

export default async function(templateName) {
  const randomPostfix = crypto.randomBytes(2).toString('hex')
  const serviceTmpDir = path.join(tmpDir, `serverless-enterprise-plugin-test-${randomPostfix}`)

  const serviceName = `enterprise-plugin-test-${randomPostfix}`
  console.info(`Setup '${serviceName}' service from '${templateName}' template at ${serviceTmpDir}`)
  // Copy template
  const [, serverlessBinPath] = await Promise.all([
    copy(path.join(__dirname, templateName), serviceTmpDir).then(async () => {
      const slsYamlPath = path.join(serviceTmpDir, 'serverless.yml')
      const slsYamlString = await readFile(slsYamlPath, 'utf8')
      return writeFile(slsYamlPath, slsYamlString.replace('CHANGEME', serviceName))
    }),
    retrieveServerless()
  ])

  console.info('... (done)')

  const sls = (args, options = {}) => {
    console.info(`Invoke sls ${args.join(' ')}`)
    const childDeferred = spawn('node', [serverlessBinPath, ...args], {
      ...options,
      cwd: serviceTmpDir,
      env: {
        ...process.env,
        SERVERLESS_PLATFORM_STAGE,
        FORCE_COLOR: '1',
        SLS_DEBUG: '*',
        ...options.env
      }
    })
    if (childDeferred.stdout) {
      childDeferred.stdout.on('data', (data) => console.info(String(data)))
    }
    if (childDeferred.stderr) {
      childDeferred.stderr.on('data', (data) => console.info(String(data)))
    }
    return childDeferred
  }
  return {
    sls,
    teardown: async () => {
      await sls(['remove'])
      return remove(serviceTmpDir)
    }
  }
}
