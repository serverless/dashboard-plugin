export class TestError extends Error {
  constructor(field, expected, recieved, resp, body) {
    super('Test failed, expected: ${expected}, recieved: ${recieved}')
    Object.assign(this, { field, expected, recieved, resp, body })
  }
}
