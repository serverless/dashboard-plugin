import boto3
from botocore.vendored import requests as boto_vendored_requests

import sys
sys.path.append('/var/task/vendor')
import requests

def success(event, context):
    boto3.client('sts').get_caller_identity()
    requests.get('https://httpbin.org/get')
    try:
        requests.get("https://asdfkasdjsdf")
    except:
        pass
    return 'success'

def error(event, context):
    raise Exception('error')
