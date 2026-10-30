"""
ASGI config for Amala School ERP backend.
Enables high-concurrency asynchronous request handling via ASGI servers (Daphne / Uvicorn).
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_asgi_application()

