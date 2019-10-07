import boto3
from botocore.vendored import requests

def success(event, context):
    boto3.client('sts').get_caller_identity()
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
