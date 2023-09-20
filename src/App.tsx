import React from 'react';
import logo from './_assets/logo400.png';
import './App.css';
import {Rendering, renderElement} from './graphviz/viz'
import svgPanZoom from "svg-pan-zoom";

type State = ErrorState | RenderingState | EmptyState;

interface ErrorState {
    isFirstDivVisible: boolean;
    element: undefined;
    error: string;
}
interface RenderingState {
    isFirstDivVisible: boolean;
    element: Rendering;
    error: undefined;
}
interface EmptyState {
    isFirstDivVisible: boolean;
    element: undefined;
    error: undefined;
}

const createEmptyState = (): EmptyState => ({isFirstDivVisible:false, element: undefined, error: undefined });
const createElementState = (element: Rendering): RenderingState => ({isFirstDivVisible:true, element, error: undefined });
const createErrorState = (error: string): ErrorState => ({isFirstDivVisible:false, element: undefined, error });

class App extends React.Component<{}, State> {
    private containerRef: React.RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();
    private panZoomContainer: SvgPanZoom.Instance | undefined;

    state: State = createEmptyState();

    private async updateGraph(): Promise<void> {
        getSource()
            .then(async data => {
                if (data !== null) {
                    let element: Rendering;
                    try {
                        element = await renderElement(data);
                    } catch (e) {
                        this.setState(createErrorState("Graph render error"));
                        return
                    }

                    if (element) {
                        this.setState(createElementState(element));
                    } else {
                        this.setState(createErrorState("Graph could not be rendered"));
                    }
                } else {
                    this.setState(createErrorState("No dot source in URL start with # or path"));
                }
            })
            .catch(error => {
                console.error("发生错误：", error);
            });
    };

    public componentDidMount() {
        this.updateGraph().then(() => {
            if (this.state.element !== undefined) {
                this.setState({
                    isFirstDivVisible: true,
                });
            }

        });
    }

    public componentDidUpdate(prevState: State) {
        const state = this.state;
        if (state.element !== prevState.element && this.containerRef.current) {
            const container = this.containerRef.current;
            removeChildren(container);

            if (isRenderingState(state)) {
                container.appendChild(state.element);

                const zoomContainer = createZoomWrapper(state.element);
                zoomContainer.zoom(0.8);

                this.destroyCurrentZoomContainer();
                this.panZoomContainer = zoomContainer;
            }
        }
    }

    private destroyCurrentZoomContainer() {
        const container = this.panZoomContainer;
        if (container)
            container.destroy();
    }

    public componentWillUnmount() {
        this.destroyCurrentZoomContainer();
    }

    public render() {
        const { isFirstDivVisible, error } = this.state;
        return (
            <div className="App">
                <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: isFirstDivVisible ? 'block' : 'none' }}>
                    <div className={"Graph"} ref={this.containerRef} />
                </div>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '90%', display: isFirstDivVisible ? 'none' : 'block' }}>
                    <header className="App-header">
                        <img src={logo} className="App-logo" alt="logo"/>
                        <p>
                            {error !== undefined ? error : <span>Loading...</span>}
                        </p>
                    </header>
                </div>
            </div>
        );
    }
}

export default App;


function isRenderingState(s: State): s is RenderingState {
    if (s.error !== undefined)
        return false;
    const e = s.element;
    if (e === undefined)
        return false;
    // Dirty hack to catch erroneous XML/SVGs by Viz.js (Chrome and Firefox output behave differently)
    return !e.innerHTML.includes("<parsererror") // Chrome
        && !e.innerHTML.includes("<sourcetext"); // Firefox
}

function removeChildren(container: HTMLElement): void {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}

const createZoomWrapper = (child: Rendering): SvgPanZoom.Instance => {
    return svgPanZoom(child, {
        zoomEnabled: true,
        controlIconsEnabled: false,
        fit: true,
        center: true,
        minZoom: 0.001,
        maxZoom: 200,
        zoomScaleSensitivity: 0.5,
    });
};


async function fetchData(fileUrl: string): Promise<string | null> {
    try {
        const response = await fetch(new Request(fileUrl));

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.text();
        return data;
    } catch (error) {
        console.error('发生错误:', error);
        return null;
    }
}

async function getSource(): Promise<string | null> {
    let source: string | null = null;

    const paramsString = window.location.search;
    let searchParams = new URLSearchParams(paramsString);
    let fileUrl = searchParams.get("path");
    if (fileUrl !== null) {
        await fetchData(fileUrl)
            .then(data => {
                if (data !== null) {
                    source = data;
                } else {
                    console.error("未能获取数据。");
                }
            })
            .catch(error => {
                console.error("发生错误：", error);
            });
    }

    const hash = window.location.hash;
    if (hash && hash.length > 1) {
        source = decodeURIComponent(hash.substring(1));
    }

    return source;
}