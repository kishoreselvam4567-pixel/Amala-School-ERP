from django.apps import AppConfig
from django.db.backends.signals import connection_created

def configure_sqlite_pragmas(sender, connection, **kwargs):
    """Enable SQLite WAL mode, busy timeout, and memory cache for high concurrency."""
    if connection.vendor == 'sqlite':
        with connection.cursor() as cursor:
            cursor.execute('PRAGMA journal_mode = WAL;')
            cursor.execute('PRAGMA synchronous = NORMAL;')
            cursor.execute('PRAGMA busy_timeout = 5000;')
            cursor.execute('PRAGMA cache_size = -64000;')
            cursor.execute('PRAGMA temp_store = MEMORY;')

class ErpApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'erp_api'

    def ready(self):
        connection_created.connect(configure_sqlite_pragmas)
