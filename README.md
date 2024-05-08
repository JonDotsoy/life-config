# life-config

Configuration on runtime.

**Example**

```ts
const lifeConfig = await LifeConfig.create(
  new FileSource<{ prefixLog: string }>("config.json"),
);

let logPrefix: string;

await lifeConfig.subscribe((state) => (logPrefix = state.logPrefix));

console.log(`${logPrefix} hello 1`); // => [log] hello 1
// echo '{ "logPrefix": "super-log" }' > config.json
console.log(`${logPrefix} hello 2`); // => [super-log] hello 2
```

## Data Source

A data source describe how to load the new configurations describe it on [source.ts](./src/dtos/source.ts).

The next sample subscribe changes on the source and connect it with [nanostores](https://github.com/nanostores/nanostores).

```ts
// config.ts
import { atom } from "nanostores";

export const logLevel = atom("info");
lifeConfig.subscribe((state) => logLevel.set(state.logLevel));
```

## File Source

A source to watch file and load on each change.

```ts
const lifeConfig = await LifeConfig.create(new FileSource("my-file.json"));
```

## Source HTTP Data

A source to refresh the state if detect changes from a http resources.

```ts
const lifeConfig = await LifeConfig.create(
  new HTTPSource("http://localhost/config"),
);
```
