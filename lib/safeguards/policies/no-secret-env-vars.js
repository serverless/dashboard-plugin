'use strict';

const { entries, fromPairs, values } = require('lodash');

// from https://github.com/dxa4481/truffleHogRegexes/blob/master/truffleHogRegexes/regexes.json
const truffleHogRegexes = {
  'Slack Token': new RegExp('(xox[p|b|o|a]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32})'),
  'RSA private key': new RegExp('-----BEGIN RSA PRIVATE KEY-----'),
  'SSH (OPENSSH) private key': new RegExp('-----BEGIN OPENSSH PRIVATE KEY-----'),
  'SSH (DSA) private key': new RegExp('-----BEGIN DSA PRIVATE KEY-----'),
  'SSH (EC) private key': new RegExp('-----BEGIN EC PRIVATE KEY-----'),
  'PGP private key block': new RegExp('-----BEGIN PGP PRIVATE KEY BLOCK-----'),
  'Facebook Oauth': new RegExp(
    '[f|F][a|A][c|C][e|E][b|B][o|O][o|O][k|K].*[\'|"][0-9a-f]{32}[\'|"]'
  ),
  'Twitter Oauth': new RegExp(
    '[t|T][w|W][i|I][t|T][t|T][e|E][r|R].*[\'|"][0-9a-zA-Z]{35,44}[\'|"]'
  ),
  'GitHub': new RegExp('[g|G][i|I][t|T][h|H][u|U][b|B].*[\'|"][0-9a-zA-Z]{35,40}[\'|"]'),
  'Google Oauth': new RegExp('("client_secret":"[a-zA-Z0-9-_]{24}")'),
  'AWS API Key': new RegExp('AKIA[0-9A-Z]{16}'),
  'Heroku API Key': new RegExp(
    '[h|H][e|E][r|R][o|O][k|K][u|U].*[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}'
  ),
  'Generic Secret': new RegExp('[s|S][e|E][c|C][r|R][e|E][t|T].*[\'|"][0-9a-zA-Z]{32,45}[\'|"]'),
  'Generic API Key': new RegExp(
    '[a|A][p|P][i|I][_]?[k|K][e|E][y|Y].*[\'|"][0-9a-zA-Z]{32,45}[\'|"]'
  ),
  'Slack Webhook': new RegExp(
    'https://hooks.slack.com/services/T[a-zA-Z0-9_]{8}/B[a-zA-Z0-9_]{8}/[a-zA-Z0-9_]{24}'
  ),
  'Google (GCP) Service-account': new RegExp('"type": "service_account"'),
  'Twilio API Key': new RegExp('SK[a-z0-9]{32}'),
  'Password in URL': new RegExp(
    '[a-zA-Z]{3,10}://[^/\\s:@]{3,20}:[^/\\s:@]{3,20}@.{1,100}["\'\\s]'
  ),
};
function isSecret(string) {
  for (const regex of values(truffleHogRegexes)) {
    if (regex.test(string)) {
      return true;
    }
  }
  return false;
}

module.exports = function noSecretEnvVarsPolicy(policy, service) {
  let failed = false;
  const {
    declaration: { functions },
    provider: { naming },
    compiled: {
      'cloudformation-template-update-stack.json': { Resources },
    },
  } = service;
  const logicalFuncNamesToConfigFuncName = fromPairs(
    Object.keys(functions || {}).map((funcName) => [naming.getLambdaLogicalId(funcName), funcName])
  );

  for (const [funcName, { Properties, Type }] of entries(Resources)) {
    if (
      Type !== 'AWS::Lambda::Function' ||
      !Properties.Environment ||
      !Properties.Environment.Variables
    ) {
      continue;
    }

    for (const [name, value] of entries(Properties.Environment.Variables)) {
      if (isSecret(value)) {
        const configFuncName = logicalFuncNamesToConfigFuncName[funcName] || funcName;
        failed = true;
        policy.fail(
          `Environment variable ${name} on function '${
            configFuncName || funcName
          }' looks like it contains a secret value`
        );
      }
    }
  }

  if (!failed) {
    policy.approve();
  }
};

module.exports.docs = 'http://slss.io/sg-no-secret-env-vars';
