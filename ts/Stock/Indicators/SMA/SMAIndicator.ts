/* *
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

'use strict';

/* *
 *
 *  Imports
 *
 * */
import type { DataColumn, DataColumns, DataTableLight } from '../../../Core/Series/Series';
import type IndicatorLike from '../IndicatorLike';
import type IndicatorValuesObject from '../IndicatorValuesObject';
import type LineSeriesType from '../../../Series/Line/LineSeries';
import type {
    SMAOptions,
    SMAParamsOptions
} from './SMAOptions';
import type SMAPoint from './SMAPoint';

import Chart from '../../../Core/Chart/Chart.js';
import SeriesRegistry from '../../../Core/Series/SeriesRegistry.js';
const {
    line: LineSeries
} = SeriesRegistry.seriesTypes;
import U from '../../../Core/Utilities.js';
const {
    addEvent,
    fireEvent,
    error,
    extend,
    isArray,
    merge,
    pick,
    splat
} = U;

/* *
 *
 *  Declarations
 *
 * */

declare module '../../../Core/Series/SeriesOptions' {
    interface SeriesOptions {
        useOhlcData?: boolean;
    }
}

interface CalculateOnObject {
    chart: string;
    xAxis?: string;
}


/**
 *
 * Return the parent series values in the legacy two-dimensional yData
 * format
 * @private
 */
const tableToMultiYData = <TLinkedSeries extends LineSeriesType>(
    series: TLinkedSeries,
    processed?: boolean
): Array<number|Array<number|null>> => {
    if (!series.useDataTable) {
        return processed ?
            (series.processedYData as any) :
            (series.yData as any);
    }

    const yData = [],
        table = processed && series.table.modified || series.table;

    if (!series.pointArrayMap) {
        return (table.columns.y || []) as any;
    }

    for (let i = 0; i < table.rowCount; i++) {
        const values = series.pointArrayMap.map((key): number =>
            (table.columns[key] as Array<number>|undefined)?.[i] || 0
        );
        yData.push(values);
    }
    return yData;
};

/* *
 *
 *  Class
 *
 * */

/**
 * The SMA series type.
 *
 * @private
 */
class SMAIndicator extends LineSeries {

    /* *
     *
     *  Static Properties
     *
     * */

    /**
     * The parameter allows setting line series type and use OHLC indicators.
     * Data in OHLC format is required.
     *
     * @sample {highstock} stock/indicators/use-ohlc-data
     *         Use OHLC data format to plot line chart
     *
     * @type      {boolean}
     * @product   highstock
     * @apioption plotOptions.line.useOhlcData
     */

    /**
     * Simple moving average indicator (SMA). This series requires `linkedTo`
     * option to be set.
     *
     * @sample stock/indicators/sma
     *         Simple moving average indicator
     *
     * @extends      plotOptions.line
     * @since        6.0.0
     * @excluding    allAreas, colorAxis, dragDrop, joinBy, keys,
     *               navigatorOptions, pointInterval, pointIntervalUnit,
     *               pointPlacement, pointRange, pointStart, showInNavigator,
     *               stacking, useOhlcData
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @optionparent plotOptions.sma
     */
    public static defaultOptions: SMAOptions = merge(LineSeries.defaultOptions, {

        /**
         * The name of the series as shown in the legend, tooltip etc. If not
         * set, it will be based on a technical indicator type and default
         * params.
         *
         * @type {string}
         */
        name: void 0,

        tooltip: {
            /**
             * Number of decimals in indicator series.
             */
            valueDecimals: 4
        },

        /**
         * The main series ID that indicator will be based on. Required for this
         * indicator.
         *
         * @type {string}
         */
        linkedTo: void 0,

        /**
         * Whether to compare indicator to the main series values
         * or indicator values.
         *
         * @sample {highstock} stock/plotoptions/series-comparetomain/
         *         Difference between comparing SMA values to the main series
         *         and its own values.
         *
         * @type {boolean}
         */
        compareToMain: false,

        /**
         * Paramters used in calculation of regression series' points.
         */
        params: {

            /**
             * The point index which indicator calculations will base. For
             * example using OHLC data, index=2 means the indicator will be
             * calculated using Low values.
             */
            index: 3,

            /**
             * The base period for indicator calculations. This is the number of
             * data points which are taken into account for the indicator
             * calculations.
             */
            period: 14

        }

    } as SMAOptions);

    /* *
     *
     *  Properties
     *
     * */

    public data!: Array<SMAPoint>;

    public dataEventsToUnbind!: Array<Function>;

    public linkedParent!: LineSeriesType;

    public nameBase?: string;

    public options!: SMAOptions;

    public points!: Array<SMAPoint>;

    /* *
     *
     *  Functions
     *
     * */

    /**
     * @private
     */
    public destroy(): void {
        this.dataEventsToUnbind.forEach(function (
            unbinder: Function
        ): void {
            unbinder();
        });
        super.destroy.apply(this, arguments);
    }

    /**
     * @private
     */
    public getName(): string {
        const params: Array<string> = [];
        let name = this.name;

        if (!name) {

            (this.nameComponents || []).forEach(
                function (component: string, index: number): void {
                    params.push(
                        (this.options.params as any)[component] +
                        pick(this.nameSuffixes[index], '')
                    );
                },
                this
            );

            name = (this.nameBase || this.type.toUpperCase()) +
                (this.nameComponents ? ' (' + params.join(', ') + ')' : '');
        }

        return name;
    }

    /**
     * @private
     */
    public getValues<TLinkedSeries extends LineSeriesType>(
        series: TLinkedSeries,
        params: SMAParamsOptions
    ): (IndicatorValuesObject<TLinkedSeries>|undefined) {
        const period: number = params.period as any,
            xVal = series.xData || [],
            yVal: Array<(number|Array<(number|null)>|null)> = series.yData as any,
            yValLen = yVal.length,
            SMA: Array<Array<number>> = [],
            xData: Array<number> = [],
            yData: Array<number> = [];
        let i: (number|undefined),
            index = -1,
            range = 0,
            SMAPoint: (Array<number>|undefined),
            sum = 0;

        if (xVal.length < period) {
            return;
        }

        // Switch index for OHLC / Candlestick / Arearange
        if (isArray(yVal[0])) {
            index = params.index ? params.index : 0;
        }

        // Accumulate first N-points
        while (range < period - 1) {
            sum += index < 0 ? yVal[range] : (yVal as any)[range][index];
            range++;
        }

        // Calculate value one-by-one for each period in visible data
        for (i = range; i < yValLen; i++) {
            sum += index < 0 ? yVal[i] : (yVal as any)[i][index];

            SMAPoint = [xVal[i], sum / period];
            SMA.push(SMAPoint);
            xData.push(SMAPoint[0]);
            yData.push(SMAPoint[1]);

            sum -= (
                index < 0 ?
                    yVal[i - range] :
                    (yVal as any)[i - range][index]
            );
        }

        return {
            values: SMA,
            xData: xData,
            yData: yData
        } as IndicatorValuesObject<TLinkedSeries>;
    }

    /**
     * @private
     */
    public init(
        chart: Chart,
        options: SMAOptions
    ): void {
        const indicator = this;

        super.init.call(
            indicator,
            chart,
            options
        );

        // Only after series are linked indicator can be processed.
        const linkedSeriesUnbiner = addEvent(
            Chart,
            'afterLinkSeries',
            function ({ isUpdating }: AnyRecord): void {
                // #18643 indicator shouldn't recalculate
                // values while series updating.
                if (isUpdating) {
                    return;
                }
                const hasEvents = !!indicator.dataEventsToUnbind.length;

                if (indicator.linkedParent) {
                    if (!hasEvents) {
                        // No matter which indicator, always recalculate after
                        // updating the data.
                        indicator.dataEventsToUnbind.push(
                            addEvent(
                                indicator.linkedParent,
                                'updatedData',
                                function (): void {
                                    indicator.recalculateValues();
                                }
                            )
                        );

                        // Some indicators (like VBP) requires an additional
                        // event (afterSetExtremes) to properly show the data.
                        if (indicator.calculateOn.xAxis) {
                            indicator.dataEventsToUnbind.push(
                                addEvent(
                                    indicator.linkedParent.xAxis,
                                    indicator.calculateOn.xAxis,
                                    function (): void {
                                        indicator.recalculateValues();
                                    }
                                )
                            );
                        }
                    }

                    // Most indicators are being calculated on chart's init.
                    if (indicator.calculateOn.chart === 'init') {
                        if (!indicator.processedYData) {
                            indicator.recalculateValues();
                        }
                    } else if (!hasEvents) {
                        // Some indicators (like VBP) has to recalculate their
                        // values after other chart's events (render).
                        const unbinder = addEvent(
                            indicator.chart,
                            indicator.calculateOn.chart,
                            function (): void {
                                indicator.recalculateValues();
                                // Call this just once.
                                unbinder();
                            }
                        );
                    }
                } else {
                    return error(
                        'Series ' +
                        indicator.options.linkedTo +
                        ' not found! Check `linkedTo`.',
                        false,
                        chart
                    ) as any;
                }
            }, {
                order: 0
            }
        );

        // Make sure we find series which is a base for an indicator
        // chart.linkSeries();

        indicator.dataEventsToUnbind = [];
        indicator.eventsToUnbind.push(linkedSeriesUnbiner);
    }

    /**
     * @private
     */
    public recalculateValues(): void {
        const croppedDataValues = [],
            indicator = this,
            table = this.table,
            oldData = indicator.points || [],
            oldDataLength = (indicator.xData || []).length,
            emptySet: IndicatorValuesObject<typeof LineSeries.prototype> = {
                values: [],
                xData: [],
                yData: []
            };
        let overwriteData = true,
            oldFirstPointIndex,
            oldLastPointIndex,
            min,
            max,
            i;

        // For the newer data table, temporarily set the parent series `yData`
        // to the legacy format that is documented for custom indicators.
        const yData = indicator.linkedParent.yData,
            processedYData = indicator.linkedParent.processedYData;
        if (indicator.useDataTable) {
            indicator.linkedParent.yData = tableToMultiYData(
                indicator.linkedParent
            ) as any;
            indicator.linkedParent.processedYData = tableToMultiYData(
                indicator.linkedParent,
                true
            ) as any;
        }


        // Updating an indicator with redraw=false may destroy data.
        // If there will be a following update for the parent series,
        // we will try to access Series object without any properties
        // (except for prototyped ones). This is what happens
        // for example when using Axis.setDataGrouping(). See #16670
        const processedData: IndicatorValuesObject<
            typeof LineSeries.prototype
        > = indicator.linkedParent.options &&
            (
                // #18176, #18177 indicators should work with empty dataset
                this.useDataTable ?
                    indicator.linkedParent.table.rowCount :
                    indicator.linkedParent.yData?.length
            ) ?
            (
                indicator.getValues(
                    indicator.linkedParent,
                    indicator.options.params as any
                ) || emptySet
            ) : emptySet;

        // Reset
        if (indicator.useDataTable) {
            indicator.linkedParent.yData = yData;
            indicator.linkedParent.processedYData = processedYData;
        }

        const pointArrayMap = indicator.pointArrayMap || ['y'],
            valueColumns: Record<string, Array<number|null>> = {};
        (processedData.yData as any)
            .forEach((values: number|null|Array<number|null>): void => {
                pointArrayMap.forEach((key, index): void => {
                    const column = valueColumns[key] || [];
                    column.push(
                        isArray(values) ? values[index] : values
                    );
                    if (!valueColumns[key]) {
                        valueColumns[key] = column;
                    }
                });
            });

        // We need to update points to reflect changes in all,
        // x and y's, values. However, do it only for non-grouped
        // data - grouping does it for us (#8572)
        if (
            oldDataLength &&
            !indicator.hasGroupedData &&
            indicator.visible &&
            indicator.points
        ) {
            // When data is cropped update only avaliable points (#9493)
            if (indicator.cropped) {
                if (indicator.xAxis) {
                    min = indicator.xAxis.min;
                    max = indicator.xAxis.max;
                }

                const croppedData = indicator.cropData(
                    processedData.xData,
                    processedData.yData,
                    min as any,
                    max as any,
                    void 0,
                    table
                );

                if (indicator.useDataTable) {
                    const keys = ['x', ...(indicator.pointArrayMap || ['y'])];
                    for (
                        let i = 0;
                        i < (croppedData.modified?.rowCount || 0);
                        i++
                    ) {
                        const values = keys.map((key): number =>
                            (
                                table.columns[key] as Array<number>|undefined
                            )?.[i] || 0
                        );
                        croppedDataValues.push(values);
                    }

                } else {
                    for (i = 0; i < croppedData.xData.length; i++) {
                        // (#10774)
                        croppedDataValues.push([
                            croppedData.xData[i]
                        ].concat(
                            splat(croppedData.yData[i])
                        ));
                    }
                }

                oldFirstPointIndex = processedData.xData.indexOf(
                    (indicator.xData as any)[0]
                );
                oldLastPointIndex = processedData.xData.indexOf(
                    (indicator.xData as any)[
                        (indicator.xData as any).length - 1
                    ]
                );

                // Check if indicator points should be shifted (#8572)
                if (
                    oldFirstPointIndex === -1 &&
                    oldLastPointIndex === processedData.xData.length - 2
                ) {
                    if (croppedDataValues[0][0] === oldData[0].x) {
                        croppedDataValues.shift();
                    }
                }

                indicator.updateData(croppedDataValues);

            } else if (
                indicator.updateAllPoints || // #18710
                // Omit addPoint() and removePoint() cases
                processedData.xData.length !== oldDataLength - 1 &&
                processedData.xData.length !== oldDataLength + 1
            ) {
                overwriteData = false;
                indicator.updateData(processedData.values as any);
            }
        }

        if (overwriteData) {
            if (this.useDataTable) {
                table.setColumns({
                    x: processedData.xData as Array<number>,
                    ...valueColumns
                });
            } else {
                indicator.xData = processedData.xData;
                indicator.yData = (processedData.yData as any);
            }
            indicator.options.data = (processedData.values as any);
        }

        // Primarily for test compliance
        if (indicator.useDataTable) {
            indicator.xData = table.columns.x as Array<number>;
            indicator.yData = table.columns.y as Array<number>;
        }

        // Removal of processedXData property is required because on
        // first translate processedXData array is empty
        if (indicator.calculateOn.xAxis && indicator.processedXData) {
            delete (indicator as Partial<typeof indicator>).processedXData;

            indicator.isDirty = true;
            indicator.redraw();
        }

        indicator.isDirtyData = !!indicator.linkedSeries.length;
        fireEvent(indicator, 'updatedData'); // #18689

    }

    /**
     * @private
     */
    public processData(): (boolean|undefined) {
        const series = this,
            compareToMain = series.options.compareToMain,
            linkedParent = series.linkedParent;

        super.processData.apply(series, arguments);

        if (
            series.dataModify &&
            linkedParent &&
            linkedParent.dataModify &&
            linkedParent.dataModify.compareValue &&
            compareToMain
        ) {
            series.dataModify.compareValue =
                linkedParent.dataModify.compareValue;
        }

        return;
    }
}

/* *
 *
 *  Class Prototype
 *
 * */

interface SMAIndicator extends IndicatorLike {
    calculateOn: CalculateOnObject;
    hasDerivedData: boolean;
    nameComponents: Array<string>|undefined;
    nameSuffixes: Array<string>;
    pointClass: typeof SMAPoint;
    useCommonDataGrouping: boolean;
    updateAllPoints?: boolean;
}
extend(SMAIndicator.prototype, {
    calculateOn: {
        chart: 'init'
    },
    hasDerivedData: true,
    nameComponents: ['period'],
    nameSuffixes: [], // e.g. Zig Zag uses extra '%'' in the legend name
    useCommonDataGrouping: true
});

/* *
 *
 *  Registry
 *
 * */

declare module '../../../Core/Series/SeriesType' {
    interface SeriesTypeRegistry {
        sma: typeof SMAIndicator;
    }
}
SeriesRegistry.registerSeriesType('sma', SMAIndicator);

/* *
 *
 *  Default Export
 *
 * */

export default SMAIndicator;

/* *
 *
 *  API Options
 *
 * */

/**
 * A `SMA` series. If the [type](#series.sma.type) option is not specified, it
 * is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.sma
 * @since     6.0.0
 * @product   highstock
 * @excluding dataParser, dataURL, useOhlcData
 * @requires  stock/indicators/indicators
 * @apioption series.sma
 */

(''); // adds doclet above to the transpiled file
