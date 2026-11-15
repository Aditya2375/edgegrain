import { input } from "../tests/cases.mjs";
import { run } from "../web/src/model.js";
console.log(
  JSON.stringify(
    Array.from({ length: 30 }, (_, i) => ({
      input: input(i),
      ...run(input(i)),
    })),
  ),
);
