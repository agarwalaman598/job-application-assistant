FROM python:3.11-slim

WORKDIR /app

# Install system deps for playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install playwright browsers
RUN playwright install chromium && playwright install-deps chromium

COPY . .

# Create data directory
RUN mkdir -p data/resumes

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
