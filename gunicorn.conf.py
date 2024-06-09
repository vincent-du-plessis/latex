# Gunicorn configuration file
# https://docs.gunicorn.org/en/stable/configure.html#configuration-file
# https://docs.gunicorn.org/en/stable/settings.html

import multiprocessing

# Number of workers
workers = multiprocessing.cpu_count() * 2 + 1

# Maximum requests per worker
max_requests = 1000

# Maximum requests jitter
max_requests_jitter = 50

# Log file settings
log_file = "/var/log/latex/access.log"

# Server socket settings
bind = "127.0.0.1:8000"
