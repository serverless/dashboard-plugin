# Serverless Platform Plugin

This is a Serverless Framework plugin which helps you use advanced monitoring, tracing and governance features via the Serverless Platform.

The Plugin automatically wraps your functions and instruments them with the Serverless Platform's monitoring, alerting, logging and tracing features.

## Quick-Start

This isn't published to npm yet, so first clone this repo.

Next, in your Serverless Framework service's `package.json`, reference it on your system as a development dependency, like this:

```json
"devDependencies": {
  "serverless-platform-plugin": "file:../../platform-plugin"
}
```

Make sure to update the path to point to the correct directory.

In your Serverless Framework service, run `npm i`

Then add the plugin to your `serverless.yml`, like this:

```yaml
plugins:
  - serverless-platform-plugin
```

## Development Notes

Currently, the `serverless-sdk` is within this project.  On deployment, this plugin copies a bundled and compressed version of the `serverless-sdk` into your Service package before it's uploaded.

If you are updating the `serverless-sdk`, afterwards be sure to cd into the `sdk-js` folder and run `npm run build` to create a bundled version in `sdk-js/dist`.  

On the next deployment, the new `sdk` will be included.
