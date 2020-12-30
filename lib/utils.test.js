'use strict';

const { expect } = require('chai');
const { upperFirst, pickResourceType } = require('./utils');

describe('utils - upperFirst', () => {
  it('capitalizes the first letter if all lowercase', () => {
    expect(upperFirst('foobar')).to.deep.equal('Foobar');
  });
  it('capitalizes the first letter if camelCase', () => {
    expect(upperFirst('fooBar')).to.deep.equal('FooBar');
  });
  it('is a no-op if alreay capitalized', () => {
    expect(upperFirst('FooBar')).to.deep.equal('FooBar');
  });
});

describe('utils - pickResourceType', () => {
  it('picks the right resource', () => {
    expect(
      pickResourceType(
        {
          Resources: {
            FooBar1: {
              Type: 'AWS::FooBar',
            },
            FooBar2: {
              Type: 'AWS::FooBar',
            },
            FooBaz: {
              Type: 'AWS::FooBaz',
            },
          },
        },
        'AWS::FooBar'
      )
    ).to.deep.equal([
      {
        key: 'FooBar1',
        resource: {
          Type: 'AWS::FooBar',
        },
      },
      {
        key: 'FooBar2',
        resource: {
          Type: 'AWS::FooBar',
        },
      },
    ]);
  });
});
