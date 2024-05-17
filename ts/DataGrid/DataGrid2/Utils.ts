/* *
 *
 *  Data Grid utilities
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Dawid Dragula
 *
 * */


/* *
 *
 *  Namespace
 *
 * */

namespace DataGridUtils {

    /* *
    *
    *  Functions
    *
    * */

    export interface MakeHTMLElementParameters {
        className?: string;
        id?: string;
        innerText?: string;
    }


    /* *
    *
    *  Functions
    *
    * */

    /**
     * Creates a HTML element with the provided options.
     *
     * @param tagName The tag name of the element.
     * @param params The parameters of the element.
     * @param parent The parent element.
     */
    export function makeHTMLElement<T extends HTMLElement>(
        tagName: string,
        params?: MakeHTMLElementParameters,
        parent?: HTMLElement
    ): T {
        const element = document.createElement(tagName);

        if (params) {
            const paramsKeys = Object.keys(
                params
            ) as (keyof MakeHTMLElementParameters)[];

            for (let i = 0; i < paramsKeys.length; i++) {
                const key = paramsKeys[i];
                const value = params[key];

                if (value !== void 0) {
                    element[key] = value;
                }
            }
        }

        if (parent) {
            parent.appendChild(element);
        }

        return element as T;
    }

    /**
     * Creates a div element with the provided class name and id.
     *
     * @param className The class name of the
     * @param id The id of the element.
     */
    export function makeDiv(className: string, id?: string): HTMLElement {
        return makeHTMLElement('div', { className, id });
    }
}


/* *
 *
 *  Default Export
 *
 * */

export default DataGridUtils;
