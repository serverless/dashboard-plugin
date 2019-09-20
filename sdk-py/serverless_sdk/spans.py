import time
from datetime import datetime


class Span:
    def __init__(self, span_type):
        self.start_isoformat = datetime.utcnow().isoformat() + "Z"
        self.start = time.time()
        self.span_type = span_type
        self.tags = {}

    def set_tag(self, tag, value):
        self.tags[tag] = value

    def end(self):
        end_isoformat = datetime.utcnow().isoformat() + "Z"
        return {
            "tags": {**self.tags, "type": self.span_type},
            "startTime": self.start_isoformat,
            "endTime": end_isoformat,
            "duration": int((time.time() - self.start) * 1000),
        }

