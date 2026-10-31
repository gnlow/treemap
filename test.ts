import { treemap } from "./mod.ts"

const svgString = treemap<[string, number]>({
    text: v => v[0],
    value: v => v[1],
    rectAttrs: datum => ({
        fill: "red",
    }),
    ratio: 5/1,
})([
    ["괴", 2],
    ["b", 1],
])

await Deno.writeTextFile("test.svg", svgString)
