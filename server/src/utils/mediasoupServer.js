const mediasoup = require('mediasoup');

const WORKER_COUNT = 4; // adjust based on your CPU cores
const workers = [];
let nextWorkerIndex = 0;

async function createMediasoupWorkers() {
  for (let i = 0; i < WORKER_COUNT; i++) {
    const base = 20000 + i * 5000; // 2000
    const worker = await mediasoup.createWorker({
      rtcMinPort: base,
      rtcMaxPort: base + 4999, // 1999
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp'],
    });

    worker.on('died', () => {
      console.error('❌ Mediasoup Worker died:', i);
    });

    workers.push(worker);
    console.log(`✅ Created worker ${i}`);
  }
}

function getNextWorker() {
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
}

async function createRouterForRoom() {
  const worker = getNextWorker();
  const router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
    ],
  });

  return router;
}

module.exports = {
  createMediasoupWorkers,
  createRouterForRoom,
};
