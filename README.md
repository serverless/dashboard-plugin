# Serverless Platform Plugin

This is a Serverless Framework plugin which helps you use advanced monitoring, tracing and governance features via the Serverless Platform.

The Plugin automatically wraps your functions and instruments them with the Serverless Platform's monitoring, alerting, logging and tracing features.

## Quick-Start
Install the plugin via NPM
```
npm install @serverless/platform-plugin
```

Then add the plugin to your `serverless.yml`, like this:
```yaml
plugins:
  - '@serverless/platform-plugin'
```

### Safeguards
To enable Serverless Safeguards, add this to your configuration:
```yaml
custom:
  safeguards: true
```

### Log Collection

For collection logs to the platform, you need to set some configuration in your serverless.yml

```yaml
custom:
  platform:
    collectLambdaLogs: true
    
    # Note: Automatic configuration for collecting API logs 
    #       is only possible on never before deployed apps for
    #       right now. his is a limitation of API Gateway and
    #       CloudFormation at the moment. We are looking for options.
    collectApiLogs: true

```

## Development Notes

You can install the latest versions from the master branch by installing the `next` tag:
```
npm install @serverless/platform-plugin@next
```

The project is transpiled with babel, so run `npm run build` before installing it

Currently, the `serverless-sdk` is within this project.  On deployment, this plugin copies a
bundled and compressed version of the `serverless-sdk` into your Service package before it's
uploaded.  

If you are updating the `serverless-sdk`, ensure you run `npm run build` to rebuild it too

On the next deployment, the new `sdk` will be included.
