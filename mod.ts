import * as d3 from "https://esm.sh/d3@7.9.0"

import {
    createCanvas,
    CanvasRenderingContext2D as Ctx,
} from "https://deno.land/x/canvas@v1.4.2/mod.ts"

type Tree<A> = {
    [key: string | number]: A[] | Tree<A>
}

interface Node<V = number> {
    name: string
    value?: V
    children?: Node[]
}

const tree_ =
<A>
(f: (a: A) => (string | number)[]) =>
(as: A[]) => {
    const root: Tree<A> = {}
    as.forEach(a => {
        let now = root
        f(a).forEach((k, i, l) => {
            if (i == l.length - 1) {
                now[k] ||= []
                ;(now[k] as A[]).push(a)
            }
            now = (now[k] ||= {}) as Tree<A>
        })
    })
    return root
}

const tree =
<A>
(f: (a: A) => (string | number)[], g: (a: A) => Node) =>
(as: A[]) => {
    const data = tree_(f)(as)
    const go = (tree: A[] | Tree<A>, name = "root"): Node => {
        if (Array.isArray(tree)) {
            return {
                name,
                children: tree.map(g)
            }
        } else {
            return {
                name,
                children: Object.entries(tree)
                    .map(([k, v]) => go(v, k))
            }
        }
    }
    return go(data)
}

type KV = [string, number]

export const treemap =
({ group, sort, bg, text }: {
    group?: (datum: KV) => (string | number)[],
    sort?: (a: KV, b: KV) => number,
    bg?: (ctx: Ctx) => (datum: KV) => void,
    text?: (ctx: Ctx) => (datum: KV) => void,
} = {}) =>
(data: KV[]) => {
    let root = d3.hierarchy<Node>(
        tree<KV>(
            group ?? (() => [""]),
            ([k, v]) => ({ name: k, value: v }),
        )(data)
    ).sum(d => d.value || 0)
    
    if (sort) {
        root = root.sort((a, b) => sort(
            [ a.data.name, a.data.value || 0 ],
            [ b.data.name, b.data.value || 0 ],
        ))
    }

    const size = [2025, 1072] as [number, number]

    const canvas = createCanvas(size[0], size[1])
    const ctx = canvas.getContext("2d")

    d3.treemap<Node>()
        .size(size)
        .padding(1)
        (root)

    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, size[0], size[1])

    ;(root as d3.HierarchyNode<Node> & {
        x0: number
        y0: number
        x1: number
        y1: number
    }).leaves().forEach(({ x0, y0, x1, y1, data }) => {
        ctx.fillStyle = "white"
        bg?.(ctx)([data.name, data.value || 0])
        ctx.fillRect(x0, y0, x1-x0, y1-y0)

        const size = Math.min(x1-x0, y1-y0) * 0.8

        ctx.fillStyle = "black"
        ctx.font = `${size}px Pretendard`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        text?.(ctx)([data.name, data.value || 0])
        ctx.fillText(
            data.name,
            (x0 + x1) / 2,
            (y0 + y1) / 2,
        )
    })
    return canvas
}
