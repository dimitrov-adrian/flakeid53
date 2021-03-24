# Flake ID 53

Simple module that aims to provide snowflake alike ID generator that fits into
[53bit number as specificed on](https://en.wikipedia.org/wiki/IEEE_754) .

As being limited to 53bit number, there is some limitation in the timespan, machine and sequence range.

-   Timespan is limited to _28_ years for given epoch
-   Machine ID is limited from `0..9`
-   Sequence is limited to `000..999`

#### Format:

`<Timestamp><Worker ID><Sequence>`

#### Example:

`8470564087028`

-   `847056408` - timespan
-   `7` - worker ID
-   `028` - sequence number

## Installation

```js
npm install flakeid53
```

## Usage

### Initialize

#### Options

`epoch: Number` Time to start the epoch of the snowflake generation, it will be used as substract for given current
time, to produce the first 38 bits.

`workerId: Number` 0-9 range machine or worker ID. It is usefull in case of usage on distributed systems.

```js
// Use as node module

const flakeId = require('flakeid53')({
    epoch: +new Date('2021-03-03'),
    workerId: 2,
});
```

```js
// Use as ES module

import createFlakeID53 from 'flakeid53';

const flakeId = createFlakeID53({
    epoch: +new Date('2021-03-03'),
    workerId: 2,
});
```

### Generate ID

```js
flakeId.nextId();

// Outputs: 8470564087028
```

### Parse given ID produced by generator

```js
flakeId.parse(8470564087028);

// Outputs: { time: 1624195860210, workerId: 7, sequence: 28 }
```

## Why this module?

In my specific case, using snowflake ID or some other 64bit alternative is not an option.
