import json
import os
import platform
import sys
import time
import traceback
import uuid
from datetime import datetime
from contextlib import contextmanager
from importlib import import_module

module_start_time = time.time()


def get_user_handler(user_handler_value):
    orig_path = sys.path
    if "/" in user_handler_value:
        user_module_path, user_module_and_handler = user_handler_value.rsplit("/", 1)
        sys.path.append(user_module_path)
    else:
        user_module_and_handler = user_handler_value

    user_module_name, user_handler_name = user_module_and_handler.split(".")
    user_module = import_module(user_module_name)
    if "/" in user_handler_value:
        sys.path.pop()

    return getattr(user_module, user_handler_name)


class SDK(object):
    def __init__(
        self,
        tenant_id,
        application_name,
        app_uid,
        tenant_uid,
        deployment_uid,
        service_name,
        stage_name,
    ):
        self.tenant_id = tenant_id
        self.application_name = application_name
        self.app_uid = app_uid
        self.tenant_uid = tenant_uid
        self.deployment_uid = deployment_uid
        self.service_name = service_name
        self.stage_name = stage_name
        self.invokation_count = 0

    def handler(self, user_handler, function_name, timeout):
        def wrapped_handler(event, context):
            with self.transaction(event, context, function_name, timeout):
                return user_handler(event, context)

        return wrapped_handler

    @contextmanager
    def transaction(self, event, context, function_name, timeout):
        start = time.time()
        start_isoformat = datetime.utcnow().isoformat() + "Z"
        exception = None
        error_data = {
            "errorCulprit": None,
            "errorExceptionMessage": None,
            "errorExceptionStacktrace": None,
            "errorExceptionType": None,
            "errorId": None,
        }
        try:
            yield
        except Exception as exc:
            exception = exc
            exc_type, exc_value, exc_traceback = sys.exc_info()
            stack_frames = traceback.extract_tb(exc_traceback)
            error_data["errorCulprit"] = "{} ({})".format(
                stack_frames[-1][2], stack_frames[-1][0]
            )
            error_data["errorExceptionMessage"] = str(exc_value)
            error_data["errorExceptionStacktrace"] = json.dumps(
                [
                    {
                        "filename": frame[0],
                        "lineno": frame[1],
                        "function": frame[2],
                        "library_frame": False,
                        "abs_path": os.path.abspath(frame[0]),
                        "pre_context": [],
                        "context_line": frame[3],
                        "post_context": [],
                    }
                    for frame in reversed(stack_frames)
                ]
            )
            error_data["errorExceptionType"] = exc_type.__name__
            error_data["errorId"] = "{}!${}".format(
                exc_type.__name__, str(exc_value)[:200]
            )
        finally:
            if os.path.exists("/proc/meminfo"):
                meminfo = {
                    line.split(":")[0].strip(): int(
                        line.split(":")[1].strip().split(" kB")[0]
                    )
                    for line in open("/proc/meminfo").readlines()
                }
            else:
                meminfo = {}
            self.invokation_count += 1
            end_isoformat = datetime.utcnow().isoformat() + "Z"
            is_custom_authorizer = "methodArn" in event and event.get("type") in (
                "TOKEN",
                "REQUEST",
            )
            is_apig = (
                all(
                    key in event
                    for key in [
                        "path",
                        "headers",
                        "requestContext",
                        "resource",
                        "httpMethod",
                    ]
                )
                and "requestId" in event["requestContext"]
            )
            if not is_custom_authorizer and is_apig:
                # For APIGW access logs
                span_id = event["requestContext"]["requestId"]
            else:
                span_id = str(uuid.uuid4())
            tags = {
                "appUid": self.app_uid,
                "applicationName": self.application_name,
                "computeContainerUptime": (time.time() - module_start_time) * 1000,
                "computeCustomArn": context.invoked_function_arn,
                "computeCustomAwsRequestId": context.aws_request_id,
                "computeCustomEnvArch": platform.architecture()[0],
                "computeCustomEnvCpus": None,  # TODO '[{"model":"Intel(R) Xeon(R) Processor @ 2.50GHz","speed":2500,"times":{"user":2200,"nice":0,"sys":2300,"idle":8511300,"irq":0}},{"model":"Intel(R) Xeon(R) Processor @ 2.50GHz","speed":2500,"times":{"user":1200,"nice":0,"sys":1700,"idle":8513400,"irq":0}}]',
                "computeCustomEnvMemoryFree": meminfo.get("MemFree") * 1024
                if meminfo
                else None,
                "computeCustomEnvMemoryTotal": meminfo.get("MemTotal") * 1024
                if meminfo
                else None,
                "computeCustomEnvPlatform": sys.platform,
                "computeCustomFunctionName": os.environ.get("AWS_LAMBDA_FUNCTION_NAME"),
                "computeCustomFunctionVersion": os.environ.get(
                    "AWS_LAMBDA_FUNCTION_VERSION"
                ),
                "computeCustomInvokeId": None,
                "computeCustomLogGroupName": os.environ.get(
                    "AWS_LAMBDA_LOG_GROUP_NAME"
                ),
                "computeCustomLogStreamName": os.environ.get(
                    "AWS_LAMBDA_LOG_STREAM_NAME"
                ),
                "computeCustomMemorySize": os.environ.get(
                    "AWS_LAMBDA_FUNCTION_MEMORY_SIZE"
                ),
                "computeCustomRegion": os.environ.get("AWS_REGION"),
                "computeCustomSchemaType": "s-compute-aws-lambda",
                "computeCustomSchemaVersion": "0.0",
                "computeCustomXTraceId": os.environ.get("_X_AMZN_TRACE_ID"),
                "computeInstanceInvocationCount": self.invokation_count,
                "computeIsColdStart": self.invokation_count == 1,
                "computeMemoryPercentageUsed": (
                    meminfo["MemTotal"] - meminfo["MemFree"]
                )
                / meminfo["MemTotal"]
                if meminfo
                else None,
                "computeMemorySize": os.environ.get("AWS_LAMBDA_FUNCTION_MEMORY_SIZE"),
                "computeMemoryUsed": None,  #'{"rss":35741696,"heapTotal":11354112,"heapUsed":7258288,"external":8636}',
                "computeRegion": os.environ.get("AWS_REGION"),
                "computeRuntime": "aws.lambda.python.{}".format(
                    sys.version.split(" ")[0]
                ),
                "computeType": "aws.lambda",
                "eventCustomStage": "dev",
                "eventSource": None,
                "eventTimestamp": start_isoformat,
                "eventType": "unknown",
                "functionName": function_name,
                "schemaType": "s-transaction-function",
                "schemaVersion": "0.0",
                "serviceName": self.service_name,
                "stageName": self.stage_name,
                "tenantId": self.tenant_id,
                "tenantUid": self.tenant_uid,
                "timeout": timeout,
                "timestamp": start_isoformat,
                "traceId": context.aws_request_id,
                "transactionId": span_id,
            }
            tags.update(error_data)
            transaction_data = {
                "type": "error" if error_data["errorId"] else "transaction",
                "origin": "sls-agent",
                "payload": {
                    "duration": (time.time() - start) * 1000,
                    "endTime": end_isoformat,
                    "logs": {},
                    "operationName": "s-transaction-function",
                    "schemaType": "s-span",
                    "schemaVersion": "0.0",
                    "spanContext": {
                        "spanId": span_id,
                        "traceId": context.aws_request_id,
                        "xTraceId": os.environ.get("_X_AMZN_TRACE_ID"),
                    },
                    "spans": [],
                    "startTime": start_isoformat,
                    "tags": tags,
                },
                "requestId": context.aws_request_id,
                "schemaVersion": "0.0",
                "timestamp": end_isoformat,
            }
            print("SERVERLESS_ENTERPRISE {}".format(json.dumps(transaction_data)))
            if exception:
                raise exception
