FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    BOA_DB_PATH=/data/boa.db

WORKDIR /app

RUN useradd --create-home --shell /usr/sbin/nologin boa \
    && mkdir -p /data \
    && chown -R boa:boa /data /app

COPY pyproject.toml README.md LICENSE ./
COPY src ./src

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

USER boa

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3).read()"

CMD ["uvicorn", "boa.main:app", "--host", "0.0.0.0", "--port", "8000"]
