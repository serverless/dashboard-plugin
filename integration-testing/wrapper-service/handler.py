import boto3
from botocore.vendored import requests as boto_vendored_requests

def success(event, context):
    boto3.client('sts').get_caller_identity()
    boto_vendored_requests.get('https://httpbin.org/get')
    try:
        boto_vendored_requests.get("https://asdfkasdjsdf")
    except:
        pass
    return 'success'

def error(event, context):
    raise Exception('error')
