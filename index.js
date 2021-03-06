/**
 * Create new Flake ID generator.
 *
 * @param {Object} options
 * @param {number} options.epoch - Epoch time to starts from.
 * The time span is limited to 28 years, so current date should fit within the epoch time.
 * Example usage: `epoch: +new Date('2021-03-03')`
 * @param {number=} options.workerId
 * Worker ID, range must be between 0..9
 *
 * @throws Error
 */
export default function createFlakeID53({ epoch, workerId }) {
    let sequenceTime = 0;
    let sequenceTick = 0;

    if (!epoch) {
        throw Error("No epoch set");
    }

    if (workerId && !Number.isInteger(workerId)) {
        throw Error("Cannot use workerId out of 0..9");
    }

    workerId = Math.abs((workerId || 0) % 10);

    return {
        /**
         * Generate next ID number
         * @returns {() => Promise<number>}
         */
        nextId,

        /**
         * Parse ID number into pieces
         * @param {number} id
         * @returns {{time: number, workerId: number, sequence: number}}
         */
        parse,
    };

    function nextId() {
        return new Promise(nextIdPromise);
    }

    /**
     * @param {CallableFunction} resolve
     * @param {CallableFunction} reject
     */
    function nextIdPromise(resolve, reject) {
        const current = Date.now();

        if (current < epoch) {
            return reject("Epoch is out of range");
        } else if (sequenceTime < current) {
            sequenceTick = 0;
            sequenceTime = current;
        } else if (sequenceTime > current) {
            return reject("Clock is shifted");
        } else {
            sequenceTick++;
        }

        if (sequenceTick > 999) {
            setTimeout(nextIdPromise, 1, resolve, reject);
        } else {
            const t = (current - epoch) % 1000000000000;
            const oor = (current - epoch) / 1000000000000;
            if (oor >= 1 || t > 900719925473) {
                reject(`Timestamp ${current} is out of range. Rejecting ID generating, as it could exceed Number.MAX_SAFE_INTEGER`);
            } else {
                resolve((t * 10 + workerId) * 1000 + sequenceTick);
            }
        }
    }

    function parse(id) {
        return {
            time: new Date(Math.floor(id / 10000) + epoch),
            sequence: id % 1000,
            workerId: Math.floor((id % 10000) / 1000),
        };
    }
}
