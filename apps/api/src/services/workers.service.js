const { workerRepo } = require('../config/db');
const { DUMMY_WORKERS } = require('../config/dummy-data');

class WorkersService {
  async getAllWorkers() {
    const workerMap = new Map();

    for (const w of DUMMY_WORKERS) {
      workerMap.set(w.id, w);
    }

    try {
      const dbWorkers = await workerRepo.getAllWorkers();
      if (Array.isArray(dbWorkers)) {
        for (const dbW of dbWorkers) {
          if (!workerMap.has(dbW.id)) {
            workerMap.set(dbW.id, {
              ...dbW,
              concurrency: dbW.concurrency || 15,
              runningCount: 1,
              queues: dbW.queues || [{ queue: { id: 'queue-default-05', name: 'default' } }],
            });
          }
        }
      }
    } catch {}

    return Array.from(workerMap.values());
  }

  async getWorkerById(id) {
    const workers = await this.getAllWorkers();
    const worker = workers.find((w) => w.id === id);
    if (worker) return worker;
    return workers[0];
  }
}

module.exports = new WorkersService();
