import objectSubsetEquals from './objectSubsetEquals'

describe('objectSubsetEquals', () => {
  it('correctly compares equal primitives', () => {
    expect(objectSubsetEquals(1, 1)).toEqual(true)
    expect(objectSubsetEquals(true, true)).toEqual(true)
    expect(objectSubsetEquals(1.1, 1.1)).toEqual(true)
    expect(objectSubsetEquals('1', '1')).toEqual(true)
  })

  it('correctly compares non equal primitives', () => {
    expect(objectSubsetEquals(2, 1)).toEqual(false)
    expect(objectSubsetEquals(true, false)).toEqual(false)
    expect(objectSubsetEquals(2.1, 1.1)).toEqual(false)
    expect(objectSubsetEquals('2', '1')).toEqual(false)
  })

  it('correctly compares exactly equal shallow objects', () => {
    expect(objectSubsetEquals({ foo: 'bar' }, { foo: 'bar' })).toEqual(true)
    expect(objectSubsetEquals({ foo: 'bar', floo: 'baz' }, { foo: 'bar', floo: 'baz' })).toEqual(
      true
    )
  })

  it('correctly compares subset equal shallow objects', () => {
    expect(objectSubsetEquals({ foo: 'bar' }, { foo: 'bar', floo: 'baz' })).toEqual(true)
  })

  it('correctly compares subset non equal shallow objects', () => {
    expect(objectSubsetEquals({ foo: 'bar' }, { foo: 'baz', floo: 'baz' })).toEqual(false)
  })

  it('correctly compares objects with differnt keys', () => {
    expect(objectSubsetEquals({ zoo: 'bar' }, { foo: 'bar' })).toEqual(false)
    expect(objectSubsetEquals({ zoo: 'bar', zloo: 'baz' }, { foo: 'bar', floo: 'baz' })).toEqual(
      false
    )
  })

  it('correctly compares objects with differnt values', () => {
    expect(objectSubsetEquals({ foo: 'baz' }, { foo: 'bar' })).toEqual(false)
    expect(objectSubsetEquals({ foo: 'baz', zloo: 'bar' }, { foo: 'bar', floo: 'baz' })).toEqual(
      false
    )
  })

  it('correctly compares subset equal complex objects', () => {
    expect(
      objectSubsetEquals({ foo: { blah: 'blah' } }, { foo: { blah: 'blah', bla: 'bla' } })
    ).toEqual(true)
    expect(
      objectSubsetEquals(
        { foo: { blah: [1, { foo: 'bar' }] } },
        { foo: { blah: [1, { floo: 'baz', foo: 'bar' }] } }
      )
    ).toEqual(true)
  })
})
