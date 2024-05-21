/* *
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Karol Kolodziej
 *
 * */

'use strict';


/* *
 *
 *  Imports
 *
 * */

import type Component from '../Component';
import type Globals from '../../Globals';
import type Options from './DataGridComponentOptions';
import type DataTable from '../../../Data/DataTable';

import DataConverter from '../../../Data/Converters/DataConverter.js';
import U from '../../../Core/Utilities.js';
const {
    uniqueKey
} = U;

/* *
 *
 *  Constants
 *
 * */

const DataGridComponentDefaults: Globals.DeepPartial<Options> = {
    dataGridClassName: 'dataGrid-container',
    dataGridID: 'dataGrid-' + uniqueKey(),
    dataGridOptions: {},
    editableOptions: [{
        name: 'connectorName',
        propertyPath: ['connector', 'id'],
        type: 'select'
    }],
    onUpdate: (e: KeyboardEvent, connector: Component.ConnectorTypes): void => {
        const inputElement = e.target as HTMLInputElement;
        if (inputElement) {
            const parentRow = inputElement
                .closest('.highcharts-datagrid-row');
            const cell = inputElement.closest('.highcharts-datagrid-cell');

            const converter = new DataConverter();

            if (
                parentRow &&
                parentRow instanceof HTMLElement &&
                cell &&
                cell instanceof HTMLElement
            ) {
                let dataTableRowIndex = parentRow.dataset.rowIndex;
                const { columnName } = cell.dataset;

                if (
                    dataTableRowIndex !== void 0 &&
                    columnName !== void 0
                ) {
                    const table = connector.table;
                    let rowIndex = Number(dataTableRowIndex);

                    if (table) {
                        if (table.getModifier()) {
                            // If the table uses a modifier it is not safe to assume
                            // that the DataGrid and DataTable indexes align.
                            rowIndex = calculateRowIndex(table, parentRow);
                        }

                        let valueToSet = converter
                            .asGuessedType(inputElement.value);

                        if (valueToSet instanceof Date) {
                            valueToSet = valueToSet.toString();
                        }

                        table.setCell(
                            columnName,
                            rowIndex,
                            valueToSet
                        );
                    }
                }
            }

            function calculateRowIndex(table: DataTable, parentRow: Element): number {
                // Iterate rows
                for (let row = 0; row < table.getRowCount(); row++) {
                    let colMatch = true;
                    // Iterate columns
                    for (let col = 0; col < parentRow.childElementCount && colMatch; col++) {
                        const cell = parentRow.children[col] as HTMLElement;
                        const columnName = cell.dataset.columnName as string;
                        const val = table.getCellAsString(columnName, row);
                        const cellText = cell.innerText;
                        if (cellText) {
                            if (cellText !== val) {
                                colMatch = false;
                            }
                        }
                    }
                    if (colMatch) {
                        // A row with matching cell values found
                        return row;
                    }
                }
                return -1;
            }
        }
    }
};

/* *
 *
 *  Default Export
 *
 * */

export default DataGridComponentDefaults;
