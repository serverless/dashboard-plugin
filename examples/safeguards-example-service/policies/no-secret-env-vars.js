// from https://github.com/dxa4481/truffleHogRegexes/blob/master/truffleHogRegexes/regexes.json
const truffleHogRegexes = {
  'Slack Token': RegExp('(xox[p|b|o|a]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32})'),
  'RSA private key': RegExp('-----BEGIN RSA PRIVATE KEY-----'),
  'SSH (OPENSSH) private key': RegExp('-----BEGIN OPENSSH PRIVATE KEY-----'),
  'SSH (DSA) private key': RegExp('-----BEGIN DSA PRIVATE KEY-----'),
  'SSH (EC) private key': RegExp('-----BEGIN EC PRIVATE KEY-----'),
  'PGP private key block': RegExp('-----BEGIN PGP PRIVATE KEY BLOCK-----'),
  'Facebook Oauth': RegExp('[f|F][a|A][c|C][e|E][b|B][o|O][o|O][k|K].*[\'|"][0-9a-f]{32}[\'|"]'),
  'Twitter Oauth': RegExp('[t|T][w|W][i|I][t|T][t|T][e|E][r|R].*[\'|"][0-9a-zA-Z]{35,44}[\'|"]'),
  GitHub: RegExp('[g|G][i|I][t|T][h|H][u|U][b|B].*[\'|"][0-9a-zA-Z]{35,40}[\'|"]'),
  'Google Oauth': RegExp('("client_secret":"[a-zA-Z0-9-_]{24}")'),
  'AWS API Key': RegExp('AKIA[0-9A-Z]{16}'),
  'Heroku API Key': RegExp(
    '[h|H][e|E][r|R][o|O][k|K][u|U].*[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}'
  ),
  'Generic Secret': RegExp('[s|S][e|E][c|C][r|R][e|E][t|T].*[\'|"][0-9a-zA-Z]{32,45}[\'|"]'),
  'Generic API Key': RegExp('[a|A][p|P][i|I][_]?[k|K][e|E][y|Y].*[\'|"][0-9a-zA-Z]{32,45}[\'|"]'),
  'Slack Webhook': RegExp(
    'https://hooks.slack.com/services/T[a-zA-Z0-9_]{8}/B[a-zA-Z0-9_]{8}/[a-zA-Z0-9_]{24}'
  ),
  'Google (GCP) Service-account': RegExp('"type": "service_account"'),
  'Twilio API Key': RegExp('SK[a-z0-9]{32}'),
  'Password in URL': RegExp('[a-zA-Z]{3,10}://[^/\\s:@]{3,20}:[^/\\s:@]{3,20}@.{1,100}["\'\\s]')
}
function isSecret(string) {
  for (const regex of Object.values(truffleHogRegexes)) {
    if (new regex.test(string)) {
      return true
    }
  }
  return false
}

module.exports = function noSecretEnvVarsPolicy(policy, service) {
  const { functions, provider: { environment } } = service.declaration

  for (const [name, value] of Object.entries(environment || {})) {
    if (isSecret(value)) {
      policy.warn(`Global environment variable ${name} looks like it contains a secret value`)
    }
  }
  for (const [funcName, funcObj] of Object.entries(functions || {})) {
    if (!funcObj.environment) {
      continue
    }
    for (const [name, value] of Object.entries(funcObj.environment || {})) {
      if (isSecret(value)) {
        policy.warn(
          `Environment variable ${name} on function '${funcName}' looks like it contains a secret value`
        )
      }
    }
  }

  policy.approve()
}
