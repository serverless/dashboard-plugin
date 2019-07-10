import os
import test
import json
import sys
import traceback
def foobar():
    try:
        test.foobar()
    except Exception as error:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        stack_frames = traceback.extract_tb(exc_traceback)
        error_data = {
            "errorCulprit": None if error is None else f"{stack_frames[0][2]} ({stack_frames[0][0]})",
            "errorExceptionMessage": None if error is None else str(exc_value),
            "errorExceptionStacktrace": None if error is None else json.dumps([
                {
                    "filename": frame[0],
                    "lineno": frame[1],
                    "function": frame[2],
                    "library_frame": False,
                    "abs_path": os.path.abspath(frame[0]),
                    "pre_context": [],
                    "context_line": frame[3],
                    "post_context": []
                }
                for frame in stack_frames
            ]),
            "errorExceptionType": None if error is None else exc_type.__name__,
            "errorId": f"{exc_type.__name__}!?{str(exc_value)[:200]}",
        }

foobar()
