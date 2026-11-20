import time
import uuid
import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

logger = logging.getLogger('erp_structured')

class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Structured Logging & Correlation ID Middleware for Amala School ERP.
    - Generates unique request_id per incoming HTTP request.
    - Captures actor identity, endpoint, duration, and status code.
    - Catches unhandled 500 server errors and returns sanitized correlation error.
    """

    def process_request(self, request):
        request.request_id = request.headers.get('X-Request-Id') or str(uuid.uuid4())[:8]
        request.start_time = time.time()

    def process_response(self, request, response):
        duration_ms = round((time.time() - getattr(request, 'start_time', time.time())) * 1000, 2)
        request_id = getattr(request, 'request_id', 'unknown')
        actor_uid = (
            request.headers.get('X-User-Uid') or
            request.headers.get('X-Teacher-Uid') or
            'guest'
        )
        
        # Add correlation header to response
        response['X-Request-Id'] = request_id

        # Log request summary
        msg = f"[{request_id}] {request.method} {request.path} | Actor: {actor_uid} | Status: {response.status_code} | Duration: {duration_ms}ms"
        if response.status_code >= 400:
            logger.warning(msg)
        else:
            logger.info(msg)

        return response

    def process_exception(self, request, exception):
        request_id = getattr(request, 'request_id', 'unknown')
        logger.error(f"[{request_id}] Unhandled Exception: {str(exception)}", exc_info=True)
        return JsonResponse({
            'error': 'Internal server error occurred. Please contact system administrator.',
            'requestId': request_id,
            'code': 'internal_error'
        }, status=500)

