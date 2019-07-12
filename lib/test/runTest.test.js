'use strict';

const fetch = require('isomorphic-fetch');
const runTest = require('./runTest');
const { TestError } = require('./errors');

jest.mock('isomorphic-fetch', () =>
  jest.fn().mockImplementation(url => {
    if (url.endsWith('/json?')) {
      return Promise.resolve({
        status: 200,
        ok: true,
        text: jest.fn().mockReturnValue(Promise.resolve(JSON.stringify({ foo: 'bar' }))),
        headers: { _headers: { Foo: 'bar' } },
      });
    } else if (url.endsWith('/text?') || url.endsWith('/text?foo=bar')) {
      return Promise.resolve({
        status: 200,
        ok: true,
        text: jest.fn().mockReturnValue(Promise.resolve('foobar')),
        headers: { _headers: { Foo: 'bar', Bla: 'bla' } },
      });
    }
    return Promise.resolve({
      status: 400,
      ok: false,
      text: jest.fn().mockReturnValue(Promise.resolve),
      headers: { _headers: {} },
    });
  })
);

afterEach(() => jest.clearAllMocks());

describe('runTest', () => {
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
    expect(fetch).toBeCalledWith('https://example.com/json?', {
      method: 'post',
      headers: {},
      body: undefined,
    });
  });

  it('can fail a JSON spec', async () => {
    await expect(
      runTest(
        {
          name: 'foobar',
          request: {},
          response: { body: { foo: 'baz' } },
        },
        'json',
        'post',
        'https://example.com'
      )
    ).rejects.toThrow(new TestError('body', { foo: 'baz' }, { foo: 'bar' }));
    expect(fetch).toBeCalledWith('https://example.com/json?', {
      method: 'post',
      headers: {},
      body: undefined,
    });
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
    expect(fetch).toBeCalledWith('https://example.com/text?', {
      method: 'post',
      headers: {},
      body: undefined,
    });
  });

  it('can fail a text spec', async () => {
    await expect(
      runTest(
        {
          name: 'foobar',
          request: {},
          response: { body: 'blah' },
        },
        'text',
        'post',
        'https://example.com'
      )
    ).rejects.toThrow(new TestError('body', 'blah', 'foobar'));
    expect(fetch).toBeCalledWith('https://example.com/text?', {
      method: 'post',
      headers: {},
      body: undefined,
    });
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
    expect(fetch).toBeCalledWith('https://example.com/text?', {
      method: 'post',
      headers: {},
      body: undefined,
    });
  });

  it('can fail a basic status check', async () => {
    await expect(
      runTest(
        {
          name: 'foobar',
          request: {},
          response: true,
        },
        'error',
        'post',
        'https://example.com'
      )
    ).rejects.toThrow(new TestError('body', 200, 400));
    expect(fetch).toBeCalledWith('https://example.com/error?', {
      method: 'post',
      headers: {},
      body: undefined,
    });
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
    expect(fetch).toBeCalledWith('https://example.com/text?', {
      method: 'post',
      headers: {},
      body: undefined,
    });
  });

  it('can fail a status check', async () => {
    await expect(
      runTest(
        {
          name: 'foobar',
          request: {},
          response: { status: 200 },
        },
        'error',
        'post',
        'https://example.com'
      )
    ).rejects.toThrow(new TestError('body', 200, 400));
    expect(fetch).toBeCalledWith('https://example.com/error?', {
      method: 'post',
      headers: {},
      body: undefined,
    });
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
    expect(fetch).toBeCalledWith('https://example.com/text?', {
      method: 'post',
      headers: {},
      body: undefined,
    });
  });

  it('can pass a headers & then fail body check', async () => {
    await expect(
      runTest(
        {
          name: 'foobar',
          request: {},
          response: { headers: { Foo: 'bar' }, body: 'foo' },
        },
        'text',
        'post',
        'https://example.com'
      )
    ).rejects.toThrow(new TestError('body', 'foo', 'foobar'));
    expect(fetch).toBeCalledWith('https://example.com/text?', {
      method: 'post',
      headers: {},
      body: undefined,
    });
  });

  it('can fail a headers check', async () => {
    await expect(
      runTest(
        {
          name: 'foobar',
          request: {},
          response: { headers: { Foo: 'bar' } },
        },
        'error',
        'post',
        'https://example.com'
      )
    ).rejects.toThrow(new TestError('headers', { Foo: 'bar' }, {}));
    expect(fetch).toBeCalledWith('https://example.com/error?', {
      method: 'post',
      headers: {},
      body: undefined,
    });
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
    expect(fetch).toBeCalledWith('https://example.com/text?', {
      method: 'post',
      headers: { Foo: 'bar' },
      body: undefined,
    });
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
    expect(fetch).toBeCalledWith('https://example.com/text?', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: '{"foo":"bar"}',
    });
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
    expect(fetch).toBeCalledWith('https://example.com/text?', {
      method: 'post',
      headers: {},
      body: 'foobar',
    });
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
    expect(fetch).toBeCalledWith('https://example.com/text?foo=bar', {
      method: 'post',
      headers: {},
      body: undefined,
    });
  });

  it('can pass with a minimal config', async () => {
    runTest(
      {
        name: 'foobar',
        response: true,
      },
      'json',
      'post',
      'https://example.com'
    );
    expect(fetch).toBeCalledWith('https://example.com/json?', {
      method: 'post',
      headers: {},
      body: undefined,
    });
  });
});
