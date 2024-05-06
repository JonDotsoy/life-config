# life-config.ts

Configuration on runtime.

**Example**

```ts
const lifeConfig = await LifeConfig.create(
  new FileSource<{ prefixLog: string }>("config.json"),
);

let logPrefix: string;

await lifeConfig.subscribe(state => logPrefix = state.logPrefix);

console.log(`${logPrefix} hello 1`) // => [log] hello 1
// echo '{ "logPrefix": "super-log" }' > config.json
console.log(`${logPrefix} hello 2`) // => [super-log] hello 2
```
