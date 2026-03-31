// This code is used for testing the functionality of BLE on node.JS using the stoprocent/noble library.
// The code works along with the prototype 2 code for the ESP32.
//
// Requires the ESP32 to send out a signal under the name 'ESP32-Jeopardy'
// Code is based on the example included with @stoprocent/Noble


// BLE Library
const noble = require('@stoprocent/noble');

const TARGET_DEVICE_NAME = 'ESP32-Jeopardy';

// Nordic UART Service UUIDs — must be lowercase without dashes and such
const NUS_SERVICE_UUID = '6e400001b5a3f393e0a9e50e24dcca9e';
const NUS_RX_UUID      = '6e400002b5a3f393e0a9e50e24dcca9e'; // Node writes, ESP receives
const NUS_TX_UUID      = '6e400003b5a3f393e0a9e50e24dcca9e'; // ESP32 writes, Node Receives


async function main() {
    console.log('[BLE] Waiting for Bluetooth adapter...');
    await noble.waitForPoweredOnAsync();
    console.log('[BLE] Adapter ready. Scanning for', TARGET_DEVICE_NAME);

    await noble.startScanningAsync(
        [NUS_SERVICE_UUID], // filter by NUS service UUID, allows faster discovery
        false
    );

    for await (const peripheral of noble.discoverAsync()) {
        const name = peripheral.advertisement.localName || '(unnamed)';
        console.log(`[SCAN] Found: "${name}" | RSSI: ${peripheral.rssi} dBm`);

        if (name !== TARGET_DEVICE_NAME) continue;

        console.log('[SCAN] Target found! Connecting...');
        await noble.stopScanningAsync();

        try {
            await connectAndCommunicate(peripheral);
        } catch (err) {
            console.error('[ERROR]', err.message);
            process.exit(1);
        }

        break;
    }
}

async function connectAndCommunicate(peripheral) {
    peripheral.on('disconnect', () => {
        console.log('[BLE] ESP32 disconnected.');
        process.exit(0);
    });

    await peripheral.connectAsync();
    console.log('[BLE] Connected to ESP32.');

    // discover NUS servce + both characteristics in one call
    const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync(
        [NUS_SERVICE_UUID],
        [NUS_RX_UUID, NUS_TX_UUID]
    );

    // Find RX and TX characteristics
    const rx = characteristics.find(c => c.uuid === NUS_RX_UUID);
    const tx = characteristics.find(c => c.uuid === NUS_TX_UUID);

    if (!rx || !tx) {
        throw new Error('Could not find NUS RX/TX characteristics. Is the correct service running on the ESP32?');
    }

    console.log('[NUS] RX characteristic found (write to ESP32)');
    console.log('[NUS] TX characteristic found (receive from ESP32)');

    // Subscribe to TX
    await tx.subscribeAsync();
    console.log('[NUS] Subscribed to TX notifications from ESP32.');

    tx.on('data', (data) => {
        const message = data.toString('utf-8').trim();
        console.log(`[ESP32 → Node] ${message}`);
    });

    // Example: Tests Node -> ESP functionality
    await sendMessage(rx, 'Hello from Node.js!');

    // Keep process going to keep receiving notifications
    console.log('[BLE] Listening for messages from ESP32. Press Ctrl+C to exit.');
}

// Helper to send a string message to the ESP
async function sendMessage(rxCharacteristic, message) {
    const buffer = Buffer.from(message, 'utf-8');
    await rxCharacteristic.writeAsync(buffer, false); // false = write with response
    console.log(`[Node → ESP32] ${message}`);
}

main().catch((err) => {
    console.error('[FATAL]', err.message);
    process.exit(1);
});
