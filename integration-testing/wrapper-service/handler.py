import time
import boto3
from botocore.vendored import requests

def success(event, context):
    with context.serverless_sdk.span('create sts client'):
        sts = boto3.client('sts')
    sts.get_caller_identity()
    requests.get('https://httpbin.org/get')
    return 'success'

def error(event, context):
    raise Exception('error')

def http_error(event, context):
    try:
        requests.get("https://asdfkasdjsdf")
    except:
        pass
    return 'http_erroO'

def event_tags(event, context):
    context.serverless_sdk.tag_event('event-tagged', 'true', { 'customerId': 5, 'userName': 'aaron.stuyvenberg'})
    return 'success'

def set_endpoint(event, context):
    context.serverless_sdk.set_endpoint('/test/:param', 'PATCH', '202')
    return 'success'

def timeout(event, context):
    time.sleep(10)
