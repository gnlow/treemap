import { treemap } from "./mod.ts"

const svgString = treemap({
    rectAttrs: datum => ({
        fill: "red",
    }),
})([
    ["괴", 2],
    ["b", 1],
])

await Deno.writeTextFile("test.svg", svgString)
