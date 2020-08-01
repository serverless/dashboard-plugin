'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('runTest', () => {
  let fetch;
  let runTest;
  before(() => {
    fetch = sinon.stub().callsFake(async (url) => {
      if (url.endsWith('/json?')) {
        return {
          status: 200,
          ok: true,
          text: async () => JSON.stringify({ foo: 'bar' }),
          headers: { _headers: { Foo: 'bar' } },
        };
      } else if (url.endsWith('/text?') || url.endsWith('/text?foo=bar')) {
        return {
          status: 200,
          ok: true,
          text: async () => 'foobar',
          headers: { _headers: { Foo: 'bar', Bla: 'bla' } },
        };
      }
      return {
        status: 400,
        ok: false,
        text: async () => {},
        headers: { _headers: {} },
      };
    });
    runTest = proxyquire('./runTest', {
      'cross-fetch': fetch,
    });
  });

  beforeEach(() => {
    fetch.resetHistory();
  });

  it('can pass a JSON spec', async () => {
    await runTest(
      {
        name: 'foobar',
        request: {},
        response: { body: { foo: 'bar' } },
      },
      'json',
      'post',
      'https://example.com'
    );
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/json?',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });

  it('can fail a JSON spec', async () => {
    try {
      await runTest(
        {
          name: 'foobar',
          request: {},
          response: { body: { foo: 'baz' } },
        },
        'json',
        'post',
        'https://example.com'
      );
      throw new Error('Unexpected');
    } catch (error) {
      expect(error.field).to.equal('body');
    }
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/json?',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });

  it('can pass a text spec', async () => {
    await runTest(
      {
        name: 'foobar',
        request: {},
        response: {
          body: 'foobar',
        },
      },
      'text',
      'post',
      'https://example.com'
    );
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/text?',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });

  it('can fail a text spec', async () => {
    try {
      await runTest(
        {
          name: 'foobar',
          request: {},
          response: { body: 'blah' },
        },
        'text',
        'post',
        'https://example.com'
      );
      throw new Error('Unexpected');
    } catch (error) {
      expect(error.field).to.equal('body');
    }
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/text?',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });

  it('can pass a basic status check', async () => {
    await runTest(
      {
        name: 'foobar',
        request: {},
        response: true,
      },
      'text',
      'post',
      'https://example.com'
    );
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/text?',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });

  it('can fail a basic status check', async () => {
    try {
      await runTest(
        {
          name: 'foobar',
          request: {},
          response: true,
        },
        'error',
        'post',
        'https://example.com'
      );
      throw new Error('Unexpected');
    } catch (error) {
      expect(error.field).to.equal('status');
    }
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/error?',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });

  it('can pass a status check', async () => {
    await runTest(
      {
        name: 'foobar',
        request: {},
        response: { status: 200 },
      },
      'text',
      'post',
      'https://example.com'
    );
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/text?',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });

  it('can fail a status check', async () => {
    try {
      await runTest(
        {
          name: 'foobar',
          request: {},
          response: { status: 200 },
        },
        'error',
        'post',
        'https://example.com'
      );
      throw new Error('Unexpected');
    } catch (error) {
      expect(error.field).to.equal('status');
    }
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/error?',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });

  it('can pass a headers check', async () => {
    await runTest(
      {
        name: 'foobar',
        request: {},
        response: { headers: { Foo: 'bar' } },
      },
      'text',
      'post',
      'https://example.com'
    );
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/text?',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });

  it('can pass a headers & then fail body check', async () => {
    try {
      await runTest(
        {
          name: 'foobar',
          request: {},
          response: { headers: { Foo: 'bar' }, body: 'foo' },
        },
        'text',
        'post',
        'https://example.com'
      );
      throw new Error('Unexpected');
    } catch (error) {
      expect(error.field).to.equal('body');
    }
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/text?',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });

  it('can fail a headers check', async () => {
    try {
      await runTest(
        {
          name: 'foobar',
          request: {},
          response: { headers: { Foo: 'bar' } },
        },
        'error',
        'post',
        'https://example.com'
      );
      throw new Error('Unexpected');
    } catch (error) {
      expect(error.field).to.equal('headers');
    }
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/error?',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });

  it('can set request headers', async () => {
    await runTest(
      {
        name: 'foobar',
        request: { headers: { Foo: 'bar' } },
        response: true,
      },
      'text',
      'post',
      'https://example.com'
    );
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/text?',
      {
        method: 'post',
        headers: { Foo: 'bar' },
        body: undefined,
      },
    ]);
  });

  it('can set request json body', async () => {
    await runTest(
      {
        name: 'foobar',
        request: { body: { foo: 'bar' } },
        response: true,
      },
      'text',
      'post',
      'https://example.com'
    );
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/text?',
      {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: '{"foo":"bar"}',
      },
    ]);
  });

  it('can set request text body', async () => {
    await runTest(
      {
        name: 'foobar',
        request: { body: 'foobar' },
        response: true,
      },
      'text',
      'post',
      'https://example.com'
    );
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/text?',
      {
        method: 'post',
        headers: {},
        body: 'foobar',
      },
    ]);
  });

  it('can set request form params', async () => {
    await runTest(
      {
        name: 'foobar',
        request: { form: { foo: 'bar' } },
        response: true,
      },
      'text',
      'post',
      'https://example.com'
    );
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/text?foo=bar',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });

  it('can set request form params AND body', async () => {
    await runTest(
      {
        name: 'foobar',
        request: { form: { foo: 'bar' }, body: 'asdf' },
        response: true,
      },
      'text',
      'post',
      'https://example.com'
    );
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/text?foo=bar',
      {
        method: 'post',
        headers: {},
        body: 'asdf',
      },
    ]);
  });

  it('can pass with a minimal config', async () => {
    await runTest(
      {
        name: 'foobar',
        response: true,
      },
      'json',
      'post',
      'https://example.com'
    );
    expect(fetch.args[0]).to.deep.equal([
      'https://example.com/json?',
      {
        method: 'post',
        headers: {},
        body: undefined,
      },
    ]);
  });
});
