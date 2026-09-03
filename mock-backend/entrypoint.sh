#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py seed_demo_data

exec gunicorn mock_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3
