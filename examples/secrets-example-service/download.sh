mkdir secrets-example-service
pushd secrets-example-service
curl https://raw.githubusercontent.com/serverless/enterprise-plugin/master/examples/secrets-example-service/package.json --output package.json
curl https://raw.githubusercontent.com/serverless/enterprise-plugin/master/examples/secrets-example-service/serverless.yml --output serverless.yml
curl https://raw.githubusercontent.com/serverless/enterprise-plugin/master/examples/secrets-example-service/handler.js --output handler.js
npm install
popd
