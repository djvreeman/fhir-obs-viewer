export interface ColumnDescription {
  /**
   * Column display name
   */
  displayName: string;
  /**
   * Property name template (could end with "[x]") of resource object
   */
  element: string;
  /**
   * FhirPath expression without resource type to get the value of the column cell.
   * Used for custom columns.
   */
  expression?: string;
  /**
   * Possible value types in the column
   */
  types: string[];
  /**
   * true if max cardinality greater than 1
   */
  isArray: boolean;
  /**
   * Boolean value that determines visibility of the column
   */
  visible: boolean;
  /**
   * Number that indicates sort order of the column
   */
  sortOrder?: number;
}
