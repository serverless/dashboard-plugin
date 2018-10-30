/*eslint-disable import/no-extraneous-dependencies*/
import _ from 'lodash';

import { cleanup, run, unzip } from '../util/unzipRun';

process.env.IOPIPE_TOKEN = 'test_token';

const dir = __dirname;

beforeAll(() => {
  unzip({ dir });
});

afterAll(() => {
  cleanup({ dir });
});

test('Generated files require plugin, include plugin inline, and export original handler', async () => {
  const simpleRes = await run({
    dir,
    file: 'simple-iopipe.js'
  });
  expect(simpleRes.statusCode).toBe(200);

  const nameMismatchRes = await run({
    dir,
    file: 'nameMismatch-iopipe.js'
  });
  expect(nameMismatchRes).toBe(301);

  const syntaxErrorRes = await run({
    dir,
    file: 'syntaxError-iopipe.js'
  });
  expect(syntaxErrorRes.message).toMatch(/Unexpected\stoken,\s/);
});
