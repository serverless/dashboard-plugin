export class TestError extends Error {
  constructor(field, expected, recieved, resp, body) {
    super(
      `Test failed, expected: ${JSON.stringify(expected)}, recieved: ${JSON.stringify(recieved)}`
    )
    Object.assign(this, { field, expected, recieved, resp, body })
  }
}
