import { treemap } from "./mod.ts"

await Deno.writeFile(
    "test.png",
    treemap({
        bg: ctx => datum => {
            ctx.fillStyle = "red"
        },
    })([
        ["a", 2],
        ["b", 1],
    ]).toBuffer(),
)
