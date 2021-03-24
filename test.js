import { describe, it, expect } from "@jest/globals";
import createFlakeID53 from "./index.js";

describe("Initialization and setup", function () {
    it("Check throws when no arguments", () => {
        expect(() => createFlakeID53()).toThrow();
    });

    it("Check workerId out of range", () => {
        expect(() => {
            createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: "a",
            });
        }).toThrow();
    });

    it("Check workerId in range", () => {
        expect(() => {
            createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: 6,
            });
        }).not.toThrow();
    });

    it("Int is less than max safe int", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-10T12:34:56.123Z"),
            workerId: 1,
        });
        expect(await flakeId.nextId()).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });
});

describe("Formats", function () {
    it("Min length", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-10T12:34:56.123Z"),
            workerId: 1,
        });
        expect((await flakeId.nextId().toString().length) > 8).toBeTruthy();
    });

    it("Worker ID", async () => {
        const generator1 = createFlakeID53({ epoch: Date.now(), workerId: 2 });
        const generator2 = createFlakeID53({ epoch: Date.now(), workerId: 3 });
        Promise.all([generator1.nextId(), generator2.nextId()]).then((x) => {
            expect(x[0]).toBeLessThan(x[1]);
        });
    });

    it("Year space", async () => {
        const currentYear = new Date().getUTCFullYear();
        const samples = [];
        for (let y = currentYear - 28; y < currentYear; y++) {
            const flakeid = createFlakeID53({
                epoch: +new Date(
                    `${y}-${new Date().getUTCMonth()}-${new Date().getUTCDate()}`
                ),
            });
            samples.push(await flakeid.nextId());
        }
        for (let i = 0; i < samples.length - 1; i++) {
            expect(samples[i]).toBeGreaterThan(samples[i + 1]);
        }
    });
});

describe("Parsing", function () {
    it("First", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-10T12:34:56.123Z"),
            workerId: 0,
        });
        expect(flakeId.parse(327283523661000)).toMatchObject({
            workerId: 1,
            time: 1911127219784,
            sequence: 0,
        });
    });

    it("Some", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-10T12:34:56.123Z"),
            workerId: 8,
        });
        expect(flakeId.parse(327283544668372)).toMatchObject({
            workerId: 8,
            time: 1911127240791,
            sequence: 372,
        });
    });
});

describe("Generation", function () {
    it("Sequence", async () => {
        const generator = createFlakeID53({ epoch: Date.now(), workerId: 1 });
        const generatedList = [];
        for (
            let i = 0;
            i < 100;
            i++, generatedList.push(await generator.nextId())
        );
        for (let i = 0; i < 99; i++) {
            expect(generatedList[i]).toBeLessThan(generatedList[i + 1]);
        }
    });

    it("Sequence with timeout", async () => {
        const generator = createFlakeID53({ epoch: Date.now(), workerId: 1 });
        const x = await generator.nextId();

        setTimeout(async () => {
            expect(x).toBeLessThan(await generator.nextId());
        }, 20);

        setTimeout(async () => {
            expect(x).toBeLessThan(await generator.nextId());
        }, 500);
    });

    it("Fast sequence", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-10T12:34:56.123Z"),
            workerId: 1,
        });
        const samples = [];
        for (let i = 0; i < 10000; i++, samples.push(await flakeId.nextId()));
        for (let i = 0; i < 9999; i++) {
            expect(samples[i]).toBeLessThan(samples[i + 1]);
        }
    });

    it("Uniqueness", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-10T12:34:56.123Z"),
            workerId: 1,
        });
        const samples = 100000;
        const values = [];
        for (let i = 0; i < samples; i++, values.push(await flakeId.nextId()));
        expect(
            values.filter((value, index, self) => self.indexOf(value) === index)
                .length
        ).toStrictEqual(samples);
    });

    it("Fast uniqueness", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-10T12:34:56.123Z"),
            workerId: 1,
        });
        const samples = [];
        for (let i = 0; i < 10000; i++, samples.push(await flakeId.nextId()));
        const uniques = samples.filter(
            (value, index, self) => self.indexOf(value) === index
        );
        expect(uniques.length).toStrictEqual(samples.length);
    });
});
