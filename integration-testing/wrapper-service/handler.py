import boto3
from botocore.vendored import requests
from serverless_sdk import tag_event, span

def success(event, context):
    with span('create sts client'):
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
    tag_event('event-tagged', 'true', { 'customerId': 5, 'userName': 'aaron.stuyvenberg'})
    return 'success'
