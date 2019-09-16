'use strict';

const objectSubsetEquals = require('./objectSubsetEquals');

describe('objectSubsetEquals', () => {
  it('correctly compares equal primitives', () => {
    expect(objectSubsetEquals(1, 1)).to.equal(true);
    expect(objectSubsetEquals(true, true)).to.equal(true);
    expect(objectSubsetEquals(1.1, 1.1)).to.equal(true);
    expect(objectSubsetEquals('1', '1')).to.equal(true);
  });

  it('correctly compares non equal primitives', () => {
    expect(objectSubsetEquals(2, 1)).to.equal(false);
    expect(objectSubsetEquals(true, false)).to.equal(false);
    expect(objectSubsetEquals(2.1, 1.1)).to.equal(false);
    expect(objectSubsetEquals('2', '1')).to.equal(false);
  });

  it('correctly compares exactly equal shallow objects', () => {
    expect(objectSubsetEquals({ foo: 'bar' }, { foo: 'bar' })).to.equal(true);
    expect(objectSubsetEquals({ foo: 'bar', floo: 'baz' }, { foo: 'bar', floo: 'baz' })).to.equal(
      true
    );
  });

  it('correctly compares subset equal shallow objects', () => {
    expect(objectSubsetEquals({ foo: 'bar' }, { foo: 'bar', floo: 'baz' })).to.equal(true);
  });

  it('correctly compares subset non equal shallow objects', () => {
    expect(objectSubsetEquals({ foo: 'bar' }, { foo: 'baz', floo: 'baz' })).to.equal(false);
  });

  it('correctly compares objects with differnt keys', () => {
    expect(objectSubsetEquals({ zoo: 'bar' }, { foo: 'bar' })).to.equal(false);
    expect(objectSubsetEquals({ zoo: 'bar', zloo: 'baz' }, { foo: 'bar', floo: 'baz' })).to.equal(
      false
    );
  });

  it('correctly compares objects with differnt values', () => {
    expect(objectSubsetEquals({ foo: 'baz' }, { foo: 'bar' })).to.equal(false);
    expect(objectSubsetEquals({ foo: 'baz', zloo: 'bar' }, { foo: 'bar', floo: 'baz' })).to.equal(
      false
    );
  });

  it('correctly compares subset equal complex objects', () => {
    expect(
      objectSubsetEquals({ foo: { blah: 'blah' } }, { foo: { blah: 'blah', bla: 'bla' } })
    ).to.equal(true);
    expect(
      objectSubsetEquals(
        { foo: { blah: [1, { foo: 'bar' }] } },
        { foo: { blah: [1, { floo: 'baz', foo: 'bar' }] } }
      )
    ).to.equal(true);
  });
});
