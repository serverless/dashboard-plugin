import path from 'path'
import fs from 'fs-extra'

const fileExists = async (filename) => {
  try {
    const stat = await fs.lstat(filename)
    return stat.isFile()
  } catch {
    return false
  }
}

export default async function getServerlessFilePath(servicePath) {
  const ymlFilePath = path.join(servicePath, 'serverless.yml')
  const yamlFilePath = path.join(servicePath, 'serverless.yaml')
  const jsonFilePath = path.join(servicePath, 'serverless.json')
  const jsFilePath = path.join(servicePath, 'serverless.js')

  const [json, yml, yaml, js] = await Promise.all([
    fileExists(jsonFilePath),
    fileExists(ymlFilePath),
    fileExists(yamlFilePath),
    fileExists(jsFilePath)
  ])
  if (yml) {
    return ymlFilePath
  } else if (yaml) {
    return yamlFilePath
  } else if (json) {
    return jsonFilePath
  } else if (js) {
    return jsFilePath
  }
  throw new Error('Could not find any serverless service definition file.')
}
