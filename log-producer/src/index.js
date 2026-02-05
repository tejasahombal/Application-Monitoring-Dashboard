const { Kafka } = require('kafkajs');
const axios = require('axios');

const kafka = new Kafka({
  clientId: 'log-producer',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const producer = kafka.producer();

const API_ENDPOINTS = [
  '/api/health',
  '/api/users',
  '/api/products'
];

const METHODS = ['GET', 'POST'];

async function generateLog() {
  const endpoint = API_ENDPOINTS[Math.floor(Math.random() * API_ENDPOINTS.length)];
  const method = METHODS[Math.floor(Math.random() * METHODS.length)];
  const timestamp = new Date().toISOString();
  
  try {
    const response = await axios({
      method,
      url: `http://api-server:3000${endpoint}`,
      data: method === 'POST' ? { name: 'Test Item' } : undefined
    });

    const log = {
      timestamp,
      method,
      endpoint,
      statusCode: response.status,
      responseTime: response.headers['x-response-time'],
      success: true
    };

    await producer.send({
      topic: 'api-logs',
      messages: [{ value: JSON.stringify(log) }]
    });

    console.log('Log sent:', log);
  } catch (error) {
    const log = {
      timestamp,
      method,
      endpoint,
      statusCode: error.response?.status || 500,
      error: error.message,
      success: false
    };

    await producer.send({
      topic: 'api-logs',
      messages: [{ value: JSON.stringify(log) }]
    });

    console.error('Error log sent:', log);
  }
}

async function start() {
  await producer.connect();
  console.log('Connected to Kafka');

  // Generate logs every 5 seconds
  setInterval(generateLog, 5000);
}

start().catch(console.error); 