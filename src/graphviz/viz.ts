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
    return  viz.renderSVGElement(dotSrc, renderOptions).catch(catcher);
}
