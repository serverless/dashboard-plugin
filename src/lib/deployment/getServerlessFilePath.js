import path from 'path'
import fs from 'fs-extra'

const fileExists = async (filename) => {
  try {
    const { isFile } = await fs.lstat(filename)
    return isFile()
  } catch {
    return false
  }
}

export default async function getServerlessFilePath() {
  const { servicePath } = this.serverless.config
  const ymlFilePath = path.join(servicePath, 'serverless.yml')
  const yamlFilePath = path.join(servicePath, 'serverless.yaml')
  const jsonFilePath = path.join(servicePath, 'serverless.json')
  const jsFilePath = path.join(servicePath, 'serverless.js')

  const [json, yml, yaml, js] = await Promise.all(
    fileExists(jsonFilePath),
    fileExists(ymlFilePath),
    fileExists(yamlFilePath),
    fileExists(jsFilePath)
  )
  if (yml) {
    return ymlFilePath
  } else if (yaml) {
    return yamlFilePath
  } else if (json) {
    return jsonFilePath
  } else if (js) {
    return jsFilePath
  }
  throw new this.serverless.classes.Error('Could not find any serverless service definition file.')
}
