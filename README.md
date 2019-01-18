# Serverless Enterprise Plugin

This is a Serverless Framework plugin which helps you use advanced monitoring, tracing and governance features via Serverless Enterprise.

The Plugin automatically wraps your functions and instruments them with Serverless Enterprise's monitoring, alerting, logging and tracing features.

## Quick-Start
Install the plugin & log into the Serverless Enterprise
```
sls install -n @serverless/enterprise-plugin
sls login
```

### Safeguards
Serverless Enterprise ships with the following safeguards by default:
* no wildcard IAM role statments
* All functions with async events must be configured with a Dead Letter Queue
* Environment variables can not contain secrets

To disable Serverless Safeguards, add this to your configuration:
```yaml
custom:
  safeguards: false
```

### Log Collection

Serverless Enterprise automatically aggregates logs. To disable them, set the following options:

```yaml
custom:
  enterprise:
    collectLambdaLogs: false
```

## Development Notes

You can install the latest versions from the master branch by installing the `next` tag:
```
npm install @serverless/enterprise-plugin@next
```

The project is transpiled with babel, so run `npm run build` before installing it

Currently, the `serverless-sdk` is within this project.  On deployment, this plugin copies a
bundled and compressed version of the `serverless-sdk` into your Service package before it's
uploaded.  

If you are updating the `serverless-sdk`, ensure you run `npm run build` to rebuild it too

On the next deployment, the new `sdk` will be included.
