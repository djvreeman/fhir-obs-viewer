import { Injectable } from '@angular/core';
import { ColumnDescription } from '../../types/column.description';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import {
  ConnectionStatus,
  FhirBackendService
} from '../fhir-backend/fhir-backend.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { SelectColumnsComponent } from '../../modules/select-columns/select-columns.component';
import { filter, map } from 'rxjs/operators';
import { capitalize } from '../utils';
import { ColumnValuesService } from '../column-values/column-values.service';
import { SettingsService } from '../settings-service/settings.service';

@Injectable({
  providedIn: 'root'
})
export class ColumnDescriptionsService {
  constructor(
    private fhirBackend: FhirBackendService,
    private dialog: MatDialog,
    private columnValues: ColumnValuesService,
    private settings: SettingsService
  ) {}

  // The subject that should generate the next value when changing the visibility of columns
  visibilityChanged: { [key: string]: BehaviorSubject<void> } = {};

  // Object which maps each resource type to the Observable of the visible column descriptions
  visibleColumns: {
    [key: string]: Observable<ColumnDescription[]>;
  } = {};

  /**
   * Compare function for column descriptions
   */
  private static sortColumns(
    a: ColumnDescription,
    b: ColumnDescription
  ): number {
    if (!a.sortOrder && !b.sortOrder) {
      return 0;
    }
    if (!a.sortOrder && b.sortOrder) {
      return 1;
    }
    if (a.sortOrder && !b.sortOrder) {
      return -1;
    }
    return a.sortOrder - b.sortOrder;
  }

  /**
   * Stores visible resource table column names in localStorage
   * @param resourceType - resource type
   * @param context - context name which used to distinguish between resource
   *  tables of the same resource type that may appear more than once in the
   *  application
   * @param columnNames - column names
   */
  setVisibleColumnNames(
    resourceType: string,
    context: string,
    columnNames: string[]
  ): void {
    window.localStorage.setItem(
      this.fhirBackend.serviceBaseUrl +
        '-' +
        resourceType +
        '-' +
        context +
        '-columns',
      columnNames.join(',')
    );
  }

  /**
   * Gets visible resource table column names from localStorage
   * @param resourceType - resource type
   * @param context - context name which used to distinguish between resource
   *  tables of the same resource type that may appear more than once in the
   *  application
   */
  getVisibleColumnNames(resourceType: string, context: string): string[] {
    return (
      window.localStorage
        .getItem(
          this.fhirBackend.serviceBaseUrl +
            '-' +
            resourceType +
            '-' +
            context +
            '-columns'
        )
        ?.split(',') || []
    );
  }

  /**
   * Open dialog to manage visible columns
   * @param resourceType - resource type
   * @param context - context name which used to distinguish between resource
   *  tables of the same resource type that may appear more than once in the
   *  application
   */
  openColumnsDialog(resourceType: string, context = ''): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.hasBackdrop = true;
    dialogConfig.data = {
      columns: this.getAvailableColumns(resourceType, context)
    };
    const dialogRef = this.dialog.open(SelectColumnsComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((columns: ColumnDescription[]) => {
      if (!columns) {
        return;
      }
      const visibleColumns = columns.filter((c) => c.visible);
      this.setVisibleColumnNames(
        resourceType,
        context,
        visibleColumns.map((c) => c.element)
      );
      this.visibilityChanged[resourceType + '-' + context].next();
    });
  }

  /**
   * Returns an Observable of visible column descriptions for the resource table
   * @param resourceType - resource type
   * @param context - context name which used to distinguish between resource
   *  tables of the same resource type that may appear more than once in the
   *  application
   */
  getVisibleColumns(
    resourceType: string,
    context = ''
  ): Observable<ColumnDescription[]> {
    const key = resourceType + '-' + context;
    if (!this.visibleColumns[key]) {
      this.visibilityChanged[key] = new BehaviorSubject<void>(undefined);
      this.visibleColumns[key] = combineLatest([
        this.fhirBackend.initialized,
        this.visibilityChanged[key]
      ]).pipe(
        filter(([status]) => status === ConnectionStatus.Ready),
        map(() => {
          return this.getAvailableColumns(resourceType, context).filter(
            (x) => x.visible
          );
        })
      );
    }
    return this.visibleColumns[key];
  }

  /**
   * Returns an array of available column descriptions for the resource table.
   * @param resourceType - resource type
   * @param context - context name which used to distinguish between resource
   *  tables of the same resource type that may appear more than once in the
   *  application
   */
  getAvailableColumns(
    resourceType: string,
    context: string
  ): ColumnDescription[] {
    const currentDefinitions = this.fhirBackend.getCurrentDefinitions();
    const columnDescriptions = currentDefinitions.resources[
      resourceType
    ].columnDescriptions.concat(
      this.settings.get(`customColumns.${resourceType}`) || [],
      (context &&
        this.settings.get(`contextColumns.${context}.${resourceType}`)) ||
        []
    );
    const visibleColumnNames = this.getVisibleColumnNames(
      resourceType,
      context
    );
    const sortSettings = this.settings.get('columnSort')?.[resourceType] ?? [];
    sortSettings.forEach((s, i) => {
      const match = columnDescriptions.find((c) => c.element === s);
      if (match) {
        match.sortOrder = i + 1;
      }
    });

    return (
      columnDescriptions
        .map((column) => {
          const displayName =
            column.displayName ||
            capitalize(column.element)
              .replace(/\[x]$/, '')
              .split(/(?=[A-Z])/)
              .join(' ');
          return {
            ...column,
            displayName,
            // Use only supported column types
            types: column.types.filter(
              (type) => this.columnValues.getValueFn(type) !== undefined
            ),
            visible:
              visibleColumnNames.indexOf(
                column.customElement || column.element
              ) !== -1
          };
        })
        // Exclude unsupported columns
        .filter((column) => column.types.length)
        // Sort based on settings
        .sort(ColumnDescriptionsService.sortColumns)
    );
  }
}
