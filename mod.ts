import * as d3 from "https://esm.sh/d3@7.9.0"

type Tree<A> = {
    [key: string | number]: A[] | Tree<A>
}

interface Node<T> {
    name: string
    value?: number
    children?: Node<T>[]
    original?: T
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
(f: (a: A) => (string | number)[], g: (a: A) => Node<A>) =>
(as: A[]) => {
    const data = tree_(f)(as)
    const go = (tree: A[] | Tree<A>, name = "root"): Node<A> => {
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

export const treemap =
<T>({
    group,
    sort,
    text = () => "",
    value = () => 1,
    rectAttrs,
    textAttrs,
    width = 320,
    height = 180,
}: {
    group?: (datum: T) => (string | number)[],
    sort?: (a: T, b: T) => number,
    text?: (datum: T) => string,
    value?: (datum: T) => number,
    rectAttrs?: (datum: T) => Record<string, string | number>,
    textAttrs?: (datum: T) => Record<string, string | number>,
    width?: number,
    height?: number,
} = {}) =>
(data: T[]) => {
    let root = d3.hierarchy<Node<T>>(
        tree<T>(
            group ?? (() => [""]),
            (d: T) => ({
                name: text(d),
                value: value(d),
                original: d,
            }),
        )(data)
    ).sum(d => d.value || 0)
    
    if (sort) {
        root = root.sort((a, b) => {
            if (a.data.original && b.data.original) {
                return sort(a.data.original, b.data.original)
            }
            return 0
        })
    }

    d3.treemap<Node<T>>()
        .size([width, height])
        .padding(1)
        (root)

    const leaves = (root as d3.HierarchyRectangularNode<Node<T>>).leaves()

    const escapeXml = (str: string) => 
        str.replace(/[<>&'"]/g, c => ({
            '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
        }[c]!))

    const rectsHtml = leaves.map(d => {
        const datum = d.data.original as T
        const customRectAttrs = rectAttrs?.(datum) ?? {}
        const customTextAttrs = textAttrs?.(datum) ?? {}
        const displayText = text(datum)

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

        const val = d.data.value ?? value(datum) ?? 1

        const textAttrStr = Object.entries({
            "text-anchor": "middle",
            "dominant-baseline": "central",
            "font-family": "'Pretendard Variable', Pretendard, sans-serif",
            fill: "black",
            ...customTextAttrs,
        }).map(([k, v]) => `${k}="${v}"`).join(" ")

        return `
    <g transform="translate(${rx},${ry})">
        <rect width="${rw}" height="${rh}" ${rectAttrStr} />
        <text x="${tx}" y="${ty}" ${textAttrStr}>${escapeXml(displayText)}</text>
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
