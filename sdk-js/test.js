const stackman = require('stackman')();

class MyErro extends Error {}

const bar = () => {
  throw new MyError();
};
const foo = () => bar();

try {
  foo();
} catch (err) {
  debugger;
  new Promise((resolve, reject) =>
    stackman.callsites(err, (error, result) => (error ? reject(error) : resolve(result)))
  )
    .then(callsites => {
      console.log(callsites);
    })
    .catch(error => {
      console.log(error);
    })
    .then(() => {
      console.log('instanceof', err instanceof Error);
      console.log(typeof err, err);
    });
}
