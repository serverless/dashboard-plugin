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

test('Generated files requires plugin and includes plugin inline', async () => {
  const simpleRes = await run({
    dir,
    file: 'simple-iopipe.js'
  });
  expect(simpleRes).toBe(200);
});
