import boto3

def success(event, context):
    boto3.client('sts').get_caller_identity()
    return 'success'

def error(event, context):
    raise Exception('error')
