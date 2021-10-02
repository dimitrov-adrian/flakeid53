import { describe, it, expect, afterEach, beforeEach, jest } from "@jest/globals";
import createFlakeID53 from "./index.js";

describe("Function setup and init", function () {
    it("Should throws when no arguments", () => {
        expect(() => createFlakeID53()).toThrow();
    });

    it("Should throw when workerId out of range", () => {
        expect(() => {
            createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: "a",
            });
        }).toThrow();
    });

    it("Should not throw when workerId in range", () => {
        expect(() => {
            createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: 6,
            });
        }).not.toThrow();
    });

    it("Produced number must be less than MAX_SAFE_INTEGER", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-10T12:34:56.123Z"),
            workerId: 1,
        });
        expect(await flakeId.nextId()).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });
});

describe("Format", function () {
    it("Minimum value", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-10T12:34:56.123Z"),
            workerId: 1,
        });
        expect(await flakeId.nextId()).toBeGreaterThanOrEqual(1000);
    });

    it("Worker ID sequence", async () => {
        const generator1 = createFlakeID53({ epoch: Date.now(), workerId: 2 });
        const generator2 = createFlakeID53({ epoch: Date.now(), workerId: 3 });
        Promise.all([generator1.nextId(), generator2.nextId()]).then((x) => {
            expect(x[0]).toBeLessThan(x[1]);
        });
    });

    it("Year space fits in 28", async () => {
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

describe("Parse", function () {
    it("First", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-08T12:34:56.123Z"),
            workerId: 0,
        });
        expect(flakeId.parse(339347453450000)).toMatchObject({
            workerId: 0,
            time: new Date("2021-04-05T06:54:01.468Z"),
            sequence: 0,
        });
    });

    it("Some", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-10T12:34:56.123Z"),
            workerId: 8,
        });

        expect(flakeId.parse(337618660288372)).toMatchObject({
            workerId: 8,
            time: new Date("2021-04-05T06:52:42.151Z"),
            sequence: 372,
        });
    });
});

describe("Generate IDs", function () {
    it("Check for sequential", async () => {
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

    it("Check if next IDs after delay are in sequence", async () => {
        const generator = createFlakeID53({ epoch: Date.now(), workerId: 1 });
        const x = await generator.nextId();

        setTimeout(async () => {
            expect(x).toBeLessThan(await generator.nextId());
        }, 20);

        setTimeout(async () => {
            expect(x).toBeLessThan(await generator.nextId());
        }, 500);
    });

    it("Fast generated, should follows sequence", async () => {
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

    it("Must not have duplicates", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-10T12:34:56.123Z"),
            workerId: 1,
        });
        const samples = 12345;
        const values = [];
        for (let i = 0; i < samples; i++, values.push(await flakeId.nextId()));
        expect(
            values.filter((value, index, self) => self.indexOf(value) === index)
                .length
        ).toStrictEqual(samples);
    });

    it("Fast generation provide uniqueness", async () => {
        const flakeId = createFlakeID53({
            epoch: +new Date("2020-03-10T12:34:56.123Z"),
            workerId: 1,
        });
        const samples = [];
        for (let i = 0; i < 20000; i++, samples.push(await flakeId.nextId()));
        const uniques = samples.filter(
            (value, index, self) => self.indexOf(value) === index
        );
        expect(uniques.length).toStrictEqual(samples.length);
    });

    it("Distributed generating must be unique", async () => {
        const flakeId = [
            createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: 1,
            }),
            createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: 2,
            }),
            createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: 6,
            }),
            createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: 8,
            }),
        ];
        const samples = 4321;
        const values = [];
        for (let i = 0; i < samples; i++) {
            for (let j = 0; j < flakeId.length; j++) {
                values.push(await flakeId[j].nextId());
            }
        }
        expect(
            values.filter((value, index, self) => self.indexOf(value) === index)
                .length
        ).toStrictEqual(samples * flakeId.length);
    });

    describe("With mocked date", function () {
        beforeEach(() => {
            jest.useFakeTimers("modern");
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it("First IDs should be sequential", async () => {
            jest.setSystemTime(+new Date("2020-03-10T12:34:56.123Z"));
            const flakeId = createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: 1,
            });
            expect(await flakeId.nextId()).toStrictEqual(1000);
            expect(await flakeId.nextId()).toStrictEqual(1001);
            expect(await flakeId.nextId()).toStrictEqual(1002);
        });

        it("Last IDs should be sequential", async () => {
            jest.setSystemTime(+new Date("2048-03-10T12:34:56.123Z"));
            const flakeId = createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: 1,
            });
            expect(await flakeId.nextId()).toStrictEqual(8836128000001000);
            expect(await flakeId.nextId()).toStrictEqual(8836128000001001);
            expect(await flakeId.nextId()).toStrictEqual(8836128000001002);
        });

        it("Last 999 IDs of epoch should be in range", async () => {
            jest.setSystemTime(+new Date("2048-03-10T12:34:56.123Z"));
            const flakeId = createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: 1,
            });
            for (let i = 0; i < 999; i++) {
                const id = await flakeId.nextId();
                expect(id).toBeLessThan(Number.MAX_SAFE_INTEGER);
            }
        });

        it("Must throw when epoch is out of range", async () => {
            const flakeId = createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: 1,
            });
            jest.setSystemTime(+new Date("2018-03-10T12:34:56.123Z"));
            await expect(flakeId.nextId()).rejects.toEqual(
                "Epoch is out of range"
            );
        });

        it("Must throw when ID time is out of range", async () => {
            const flakeId = createFlakeID53({
                epoch: +new Date("2020-03-10T12:34:56.123Z"),
                workerId: 1,
            });
            jest.setSystemTime(+new Date("2049-03-10T12:34:56.123Z"));
            await expect(flakeId.nextId()).rejects.toMatch(
                "Number.MAX_SAFE_INTEGER"
            );
        });
    });
});
