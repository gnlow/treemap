import * as d3 from "https://esm.sh/d3@7.9.0"

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
({ group, sort, rectAttrs, textAttrs }: {
    group?: (datum: KV) => (string | number)[],
    sort?: (a: KV, b: KV) => number,
    rectAttrs?: (datum: KV) => Record<string, string | number>,
    textAttrs?: (datum: KV) => Record<string, string | number>,
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

    const [width, height] = [1600, 900]

    d3.treemap<Node>()
        .size([width, height])
        .padding(1)
        (root)

    const leaves = (root as d3.HierarchyRectangularNode<Node>).leaves()

    const escapeXml = (str: string) => 
        str.replace(/[<>&'"]/g, c => ({
            '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
        }[c]!))

    const rectsHtml = leaves.map(d => {
        const datum: KV = [d.data.name, d.data.value || 0]
        const customRectAttrs = rectAttrs?.(datum) ?? {}
        const customTextAttrs = textAttrs?.(datum) ?? {}

        const rx = d.x0
        const ry = d.y0
        const rw = d.x1 - d.x0
        const rh = d.y1 - d.y0

        const rectAttrStr = Object.entries({
            fill: "white",
            ...customRectAttrs
        }).map(([k, v]) => `${k}="${v}"`).join(" ")

        const tx = rw / 2
        const ty = rh / 2
        const fontSize = Math.min(rw, rh) * 0.8

        const textAttrStr = Object.entries({
            "text-anchor": "middle",
            "dominant-baseline": "central",
            "font-family": "'Pretendard Variable', Pretendard, sans-serif",
            "font-size": `${fontSize}px`,
            fill: "black",
            ...customTextAttrs
        }).map(([k, v]) => `${k}="${v}"`).join(" ")

        return `
    <g transform="translate(${rx},${ry})">
        <rect width="${rw}" height="${rh}" ${rectAttrStr} />
        <text x="${tx}" y="${ty}" ${textAttrStr}>${escapeXml(d.data.name)}</text>
    </g>`
    }).join("")

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <style>
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css");
    </style>
    <rect width="${width}" height="${height}" fill="white" />
    ${rectsHtml}
</svg>`
}
