const axios = require('axios');

const API_BASE_URL = 'http://api-server:3000';
const REQUEST_INTERVAL = process.env.REQUEST_INTERVAL || 1000; // 1 second

const endpoints = [
    // Success endpoints
    { method: 'GET', path: '/api/tasks' },
    { method: 'POST', path: '/api/tasks', body: { name: 'New Task', completed: false } },
    { method: 'GET', path: '/api/tasks/1' },
    { method: 'PUT', path: '/api/tasks/1', body: { completed: true } },
    { method: 'DELETE', path: '/api/tasks/1' },
    { method: 'GET', path: '/api/users' },
    { method: 'POST', path: '/api/users', body: { name: 'John Doe', email: 'john@example.com' } },
    { method: 'GET', path: '/api/users/1' },
    { method: 'PUT', path: '/api/users/1', body: { name: 'Jane Doe' } },
    { method: 'DELETE', path: '/api/users/1' },
    { method: 'GET', path: '/health' },
    
    // 404 Not Found errors
    { method: 'GET', path: '/api/tasks/999' },  // Non-existent task
    { method: 'GET', path: '/api/users/999' },  // Non-existent user
    { method: 'GET', path: '/api/nonexistent' }, // Non-existent endpoint
    
    // 400 Bad Request errors
    { method: 'POST', path: '/api/tasks', body: { invalid: true } },  // Missing required fields
    { method: 'POST', path: '/api/users', body: { invalid: true } },  // Missing required fields
    
    // 401 Unauthorized errors
    { method: 'GET', path: '/api/users/protected', headers: { 'Authorization': 'invalid' } },
    
    // 403 Forbidden errors
    { method: 'DELETE', path: '/api/users/admin' },  // Trying to delete admin user
    
    // 500 Internal Server errors
    { method: 'GET', path: '/api/error' },  // Endpoint that triggers server error
    { method: 'POST', path: '/api/tasks/error', body: { trigger: 'error' } }  // Another error trigger
];

async function simulateWorkload() {
    while (true) {
        try {
            // Pick 3 random endpoints to call
            for (let i = 0; i < 3; i++) {
                const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
                try {
                    const response = await axios({
                        method: endpoint.method,
                        url: `${API_BASE_URL}${endpoint.path}`,
                        data: endpoint.body,
                        headers: endpoint.headers || {}
                    });
                    console.log(`${endpoint.method} ${endpoint.path} - ${response.status}`);
                } catch (error) {
                    if (error.response) {
                        console.log(`Error: ${endpoint.method} ${endpoint.path} - ${error.response.status}`);
                    } else {
                        console.error(`Error making request to ${endpoint.path}:`, error.message);
                    }
                }
            }

            // Wait a short time before next batch
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.error('Error in simulation loop:', error);
            // Wait 5 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
            // Continue the loop
            continue;
        }
    }
}

// Start the simulation with auto-restart
function startSimulationWithAutoRestart() {
    simulateWorkload().catch(error => {
        console.error('Simulation stopped with error:', error);
        console.log('Restarting simulation in 5 seconds...');
        setTimeout(startSimulationWithAutoRestart, 5000);
    });
}

// Start the simulation
startSimulationWithAutoRestart(); 