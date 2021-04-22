/* eslint-disable require-jsdoc */
export function sumPixels(accumulator: number, value: string | number | undefined): number {
    if (value) {
        accumulator += typeof value === 'number' ? value : parseFloat(value);
    }
    return accumulator;
}

export function getStyles(element: HTMLElement, styles: Array<keyof CSSStyleDeclaration>): string[] {
    const elementStyles = window.getComputedStyle(element);
    return styles.map((style: string): string => elementStyles[style as any]); // Cannot use getPropertyValue?
}

export function getMargins(
    element: HTMLElement,
    includeBorders: boolean = true
): { x: number; y: number } {
    const borders: Record<'x' | 'y', Array<keyof CSSStyleDeclaration>> =
        { x: ['borderLeft', 'borderRight'], y: ['borderTop', 'borderBottom'] };

    return {
        y: getStyles(element, ['marginTop', 'marginBottom', ...(includeBorders ? borders.y : [])])
            .reduce(sumPixels, 0),
        x: getStyles(element, ['marginLeft', 'marginTop', ...(includeBorders ? borders.x : [])])
            .reduce(sumPixels, 0)
    };
}

export function getPaddings(element: HTMLElement): { x: number; y: number } {
    return {
        x: getStyles(element, ['paddingLeft', 'paddingRight']).reduce(sumPixels, 0),
        y: getStyles(element, ['paddingTop', 'paddingBottom']).reduce(sumPixels, 0)
    };
}
