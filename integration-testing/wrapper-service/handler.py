import boto3
from botocore.vendored import requests

def success(event, context):
    with context.span('create sts client'):
        sts = boto3.client('sts')
    sts.get_caller_identity()
    requests.get('https://httpbin.org/get')
    return 'success'

def error(event, context):
    raise Exception('error')
