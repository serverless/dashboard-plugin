import { upperFirst, pickResourceType } from './utils'

describe('utils - upperFirst', () => {
  it('capitalizes the first letter if all lowercase', () => {
    expect(upperFirst('foobar')).toEqual('Foobar')
  })
  it('capitalizes the first letter if camelCase', () => {
    expect(upperFirst('fooBar')).toEqual('FooBar')
  })
  it('is a no-op if alreay capitalized', () => {
    expect(upperFirst('FooBar')).toEqual('FooBar')
  })
})

describe('utils - pickResourceType', () => {
  it('picks the right resource', () => {
    expect(
      pickResourceType(
        {
          Resources: {
            FooBar1: {
              Type: 'AWS::FooBar'
            },
            FooBar2: {
              Type: 'AWS::FooBar'
            },
            FooBaz: {
              Type: 'AWS::FooBaz'
            }
          }
        },
        'AWS::FooBar'
      )
    ).toEqual([
      {
        key: 'FooBar1',
        resource: {
          Type: 'AWS::FooBar'
        }
      },
      {
        key: 'FooBar2',
        resource: {
          Type: 'AWS::FooBar'
        }
      }
    ])
  })
})
