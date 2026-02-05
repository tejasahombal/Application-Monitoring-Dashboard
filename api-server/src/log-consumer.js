const { Kafka } = require('kafkajs');
const axios = require('axios');

// Kafka configuration
const kafka = new Kafka({
    clientId: 'log-consumer',
    brokers: ['kafka:9092']
});

// Loki configuration
const LOKI_URL = process.env.LOKI_URL || 'http://loki:3100';

const consumer = kafka.consumer({ groupId: 'log-processor' });

// Function to send logs to Loki
async function sendToLoki(logs) {
    try {
        console.log('Preparing to send logs to Loki:', logs.length, 'logs');
        const lokiPayload = {
            streams: [{
                stream: {
                    app: "api-server",
                    level: "info"
                },
                values: logs.map(log => [
                    `${new Date(log.timestamp).getTime() * 1000000}`,
                    JSON.stringify(log)
                ])
            }]
        };

        console.log('Sending logs to Loki at:', `${LOKI_URL}/loki/api/v1/push`);
        const response = await axios.post(`${LOKI_URL}/loki/api/v1/push`, lokiPayload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Successfully sent logs to Loki:', {
            status: response.status,
            statusText: response.statusText,
            data: response.data
        });
    } catch (error) {
        console.error('Error sending logs to Loki:', {
            message: error.message,
            url: `${LOKI_URL}/loki/api/v1/push`,
            response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : 'No response',
            stack: error.stack
        });
    }
}

async function startConsumer() {
    try {
        await consumer.connect();
        console.log('Connected to Kafka');

        // Subscribe to both API logs and error logs
        await consumer.subscribe({ topics: ['api-logs', 'error-logs'] });

        // Buffer to collect logs before sending to Loki
        let logBuffer = [];
        const BUFFER_SIZE = 10;
        const FLUSH_INTERVAL = 5000; // 5 seconds

        console.log('Starting log consumer with buffer size:', BUFFER_SIZE, 'and flush interval:', FLUSH_INTERVAL, 'ms');

        // Periodically flush logs to Loki
        setInterval(async () => {
            if (logBuffer.length > 0) {
                console.log('Flushing log buffer to Loki:', logBuffer.length, 'logs');
                try {
                    await sendToLoki(logBuffer);
                    console.log('Successfully flushed logs to Loki');
                } catch (error) {
                    console.error('Error flushing logs to Loki:', error);
                }
                logBuffer = [];
                console.log('Log buffer cleared');
            }
        }, FLUSH_INTERVAL);

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const log = JSON.parse(message.value.toString());
                    console.log(`Received log from ${topic}:`, log);

                    // Add to buffer
                    logBuffer.push(log);
                    console.log('Added log to buffer. Current buffer size:', logBuffer.length);

                    // If buffer is full, send to Loki
                    if (logBuffer.length >= BUFFER_SIZE) {
                        console.log('Buffer full, sending to Loki');
                        try {
                            await sendToLoki(logBuffer);
                            console.log('Successfully sent full buffer to Loki');
                        } catch (error) {
                            console.error('Error sending full buffer to Loki:', error);
                        }
                        logBuffer = [];
                        console.log('Buffer cleared after sending to Loki');
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            },
        });
    } catch (error) {
        console.error('Error in consumer:', error);
        process.exit(1);
    }
}

startConsumer().catch(console.error); 