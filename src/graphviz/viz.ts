import Viz from "viz.js";
import workerURL from "viz.js/full.render.js";
const createViz = () => new Viz(workerURL);

let viz = createViz();

const catcher = (error: Error) => {
    viz = createViz()
    throw error;
};

export type Rendering = SVGSVGElement
export function renderElement(dotSrc: string): Promise<Rendering> {
    const renderOptions = {
        engine: "dot"
    };
    const isOver400KB: boolean = isStringOver400KB(dotSrc);
    if (isOver400KB) {
        renderOptions.engine = "twopi"
    }

    return  viz.renderSVGElement(dotSrc, renderOptions).catch(catcher);
}

function isStringOver400KB(str: string): boolean {
    const bytes = new TextEncoder().encode(str);
    const kb = bytes.length / 1024;

    return kb > 400;
}