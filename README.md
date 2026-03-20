🚀 Application Monitoring Dashboard

A containerized application monitoring and observability platform built using Docker, Kafka, Prometheus, Loki, Grafana, and Node.js.
It provides real-time insights into system performance, API behavior, and log analytics through a scalable, event-driven architecture.

🧠 Architecture Overview

Node.js API → Generates application logs & metrics

Kafka → Handles asynchronous log streaming

Log Consumer → Buffers and processes logs before sending to Loki

Loki → Stores structured logs

Prometheus → Collects and stores metrics

Grafana → Visualizes logs and metrics in real time

⚙️ Tech Stack

Docker & Docker Compose

Node.js

Apache Kafka

Prometheus

Loki

Grafana

✨ Key Features

Real-time monitoring of API performance

Kafka-based asynchronous log streaming pipeline

Buffered log processing for efficient ingestion into Loki

Metrics collection using Prometheus

Interactive dashboards in Grafana

Visualization of:

Request rate

Latency trends

Error rates

System behavior

📦 Setup Instructions
Prerequisites

Docker installed and running

Minimum 4GB RAM

Run the Project
git clone <your-repo-url>
cd <repo-name>
docker-compose up -d

⏳ Wait ~30–60 seconds for services to initialize

🌐 Access Services
Service	URL
API Server	http://localhost:3000

Grafana	http://localhost:3001

Prometheus	http://localhost:9090

Loki	http://localhost:3100

Grafana Login

Username: admin

Password: admin

📊 Monitoring Dashboards

Grafana dashboards provide:

Request Rate Monitoring → Track incoming traffic per endpoint

Latency Analysis → Observe response time trends

Error Tracking → Identify and analyze failures

Log Exploration → Real-time log streaming from Loki

🔄 Log Processing Pipeline

API generates logs

Kafka Producer sends logs to Kafka topics

Kafka Consumer processes logs asynchronously

Logs are buffered and structured

Logs are pushed to Loki via HTTP API

Grafana visualizes logs in real time

🛠️ Useful Commands
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Check running containers
docker-compose ps

# Restart a service
docker-compose restart <service-name>
🧪 System Behavior Simulation (if you included it)

Continuous API traffic generation

Multiple HTTP methods (GET, POST, PUT, DELETE)

Simulated error responses

Helps test monitoring pipelines in real time

(Remove this section if you didn’t implement simulator)

⚠️ Troubleshooting

No data in Grafana → Ensure all containers are running

Missing logs → Check Kafka consumer and Loki

No metrics → Verify Prometheus targets

📈 Future Improvements

Alerting system (Grafana alerts / Alertmanager)

Distributed tracing (Jaeger / OpenTelemetry)

Kubernetes deployment

Role-based dashboard access

📌 Project Highlights

Event-driven architecture using Kafka

End-to-end observability (metrics + logs)

Scalable and containerized deployment

Real-time monitoring system design
