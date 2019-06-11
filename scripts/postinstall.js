const truthyStr = (val) => val && !['0', 'false', 'f', 'n', 'no'].includes(val.toLowerCase())
const chalk = require('chalk')
const { CI, ADBLOCK, SILENT } = process.env
if (!truthyStr(CI) && !truthyStr(ADBLOCK) && !truthyStr(SILENT)) {
  // eslint-disable-next-line no-console
  console.log(
    chalk.yellow(`\
 +------------------------------------------------------------------+
 |                                                                  |
 |  Serverless Framework successfully installed!                    |
 |  To start your first project, run “serverless” in a new folder.  |
 |                                                                  |
 +------------------------------------------------------------------+
`)
  )
}
