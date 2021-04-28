import { Injectable } from '@angular/core';
import { ColumnDescription } from '../../types/column.description';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import {
  ConnectionStatus,
  FhirBackendService
} from '../fhir-backend/fhir-backend.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { SelectColumnsComponent } from '../../modules/select-columns/select-columns.component';
import { filter, map } from 'rxjs/operators';
import { capitalize } from '../utils';
import { ColumnValuesService } from '../column-values/column-values.service';

@Injectable({
  providedIn: 'root'
})
export class ColumnDescriptionsService {
  visibleColumns: { [key: string]: BehaviorSubject<ColumnDescription[]> } = {};
  subscriptions: Subscription[] = [];
  constructor(
    private fhirBackend: FhirBackendService,
    private dialog: MatDialog,
    private columnValues: ColumnValuesService
  ) {}

  /**
   * Open dialog to manage visible columns
   */
  openColumnsDialog(resourceType: string): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.hasBackdrop = true;
    dialogConfig.data = {
      columns: this.getAvailableColumns(resourceType)
    };
    const dialogRef = this.dialog.open(SelectColumnsComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((columns: ColumnDescription[]) => {
      if (!columns) {
        return;
      }
      this.visibleColumns[resourceType].next(columns.filter((x) => x.visible));
      window.localStorage.setItem(
        resourceType + '-columns',
        columns
          .filter((x) => x.visible)
          .map((x) => x.element)
          .join(',')
      );
    });
  }

  /**
   * Returns an Observable of visible column descriptions for the resource table
   * @param resourceType - resource type
   */
  getVisibleColumns(resourceType: string): Observable<ColumnDescription[]> {
    if (!this.visibleColumns[resourceType]) {
      this.visibleColumns[resourceType] = new BehaviorSubject([]);
      this.subscriptions.push(
        // Initialize visible columns on server initialization
        this.fhirBackend.initialized
          .pipe(
            filter((status) => status === ConnectionStatus.Ready),
            map(() => this.getAvailableColumns(resourceType))
          )
          .subscribe((columns) => {
            this.visibleColumns[resourceType].next(
              columns.filter((x) => x.visible)
            );
          })
      );
    }
    return this.visibleColumns[resourceType];
  }

  /**
   * Returns an array of available column descriptions for the resource table.
   * @param resourceType - resource type
   */
  getAvailableColumns(resourceType: string): ColumnDescription[] {
    const currentDefinitions = this.fhirBackend.getCurrentDefinitions();
    const columnDescriptions =
      currentDefinitions.resources[resourceType].columnDescriptions;
    const visibleColumnsRawString = window.localStorage.getItem(
      resourceType + '-columns'
    );
    const visibleColumnNames = visibleColumnsRawString
      ? visibleColumnsRawString.split(',')
      : [];

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
    );
  }

  /**
   * Unsubscribe from all subscriptions.
   */
  destroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }
}