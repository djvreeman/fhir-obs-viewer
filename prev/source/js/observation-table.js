import {
  addressToStringArray,
  getPatientAge,
  getPatientContactsByType,
  humanNameToString
} from './common/utils';
import { getCurrentDefinitions } from './search-parameters/common-descriptions';
import { ResourceTable } from './resource-table';
import { getFhirClient } from './common/fhir-service';

const reValueKey = /^value/;

export class ObservationTable extends ResourceTable {
  constructor({ callbacks, resourceType = 'Observation' }) {
    super({ callbacks, resourceType });

    // Mapping for each cell in a row for display:
    // title - column caption
    // columnName - if a value is specified, then this column is displayed by the condition
    //              that this value is present in the column array for display (this._additionalColumns),
    //              also this value specifies column name for a request to the FHIR server;
    //              otherwise, if no value is specified, this column is constantly displayed.
    // text - callback to get cell text/html
    // [condition] - callback which returns true if column could be visible
    this.viewCellsTemplate = [
      {
        title: 'Patient Id',
        text: (obs) => obs.subject.reference.replace(/^Patient\//, '')
      },
      {
        title: 'Patient',
        text: (obs) => this.getPatientName(obs)
      },
      {
        title: 'Gender',
        columnName: 'gender',
        text: (obs) =>
          this.valueSetMapByPath['Patient.gender'][
            this.getPatient(obs).gender
          ] || ''
      },
      {
        title: 'Age',
        columnName: 'age',
        text: (obs) => this.getPatient(obs)._age || ''
      },
      {
        title: 'Birth date',
        columnName: 'birthdate',
        text: (obs) => this.getPatient(obs).birthDate || ''
      },
      {
        title: 'Death date',
        columnName: 'death-date',
        text: (obs) => this.getPatient(obs).deceasedDateTime || ''
      },
      {
        title: 'Address',
        columnName: 'address',
        text: (obs) => this.getPatient(obs)._address.join('<br>')
      },
      {
        title: 'Phone',
        columnName: 'phone',
        text: (obs) => this.getPatient(obs)._phone.join('<br>')
      },
      {
        title: 'Email',
        columnName: 'email',
        text: (obs) => this.getPatient(obs)._email.join('<br>')
      },
      {
        title: 'Language',
        columnName: 'language',
        text: (obs) => {
          const communication = this.getPatient(obs).communication;
          return (communication && communication.language) || '';
        }
      },
      // TODO: Can't just get a Practitioner name from Patient data
      // {
      //   title: 'General practitioner',
      //   columnName: 'general-practitioner',
      //   text: obs => {
      //     const patient = this.getPatient(obs);
      //     return patient && patient.generalPractitioner && patient.generalPractitioner[0]
      //       && patient.generalPractitioner[0].reference || '';
      //   }
      // },
      {
        title: 'Date',
        condition: () => getFhirClient().getFeatures().sortObservationsByDate,
        text: (obs) => {
          const date = obs.effectiveDateTime;
          if (date) {
            const tIndex = date.indexOf('T');
            return tIndex >= 0 ? date.slice(0, tIndex) : date;
          } else {
            return '';
          }
        }
      },
      {
        title: 'Time',
        condition: () => getFhirClient().getFeatures().sortObservationsByDate,
        text: (obs) => {
          const date = obs.effectiveDateTime;

          if (date) {
            const tIndex = date.indexOf('T');
            return tIndex >= 0 ? date.slice(tIndex + 1) : '';
          } else {
            return '';
          }
        }
      },
      {
        title: 'Age at event',
        condition: () =>
          getFhirClient().getFeatures().sortObservationsByAgeAtEvent,
        text: (obs) => {
          let result = '';

          obs.extension &&
            obs.extension.some((item) => {
              const isAgeAtEvent =
                item.url ===
                'http://fhir.ncpi-project-forge.io/StructureDefinition/age-at-event';
              if (isAgeAtEvent && item.valueAge) {
                result = item.valueAge.value + ' ' + item.valueAge.unit;
                return true;
              }
              return isAgeAtEvent;
            });

          return result;
        }
      },
      {
        title: 'Test Name',
        text: (obs) => this.getDisplayOfCodeableConcept(obs.code)
      },
      {
        title: 'Value',
        text: (obs) => this.getObservationValue(obs)
      },
      {
        title: 'FHIR Observation',
        text: (obs) => {
          const id = obs.id,
            href = this.serviceBaseUrl + '/Observation/' + obs.id;

          return `<a href="${href}" target="_blank" rel="noopener noreferrer">${id}</a>`;
        }
      },
      {
        title: 'Interpretation',
        text: (obs) => {
          const codeableConcept = obs.interpretation && obs.interpretation[0];

          return this.getDisplayOfCodeableConcept(codeableConcept);
        }
      }
    ];

    // Mapping for each cell in a row for export to CSV-file
    this.exportCellsTemplate = this.viewCellsTemplate.map((desc) => {
      if (desc.title === 'FHIR Observation') {
        return {
          title: desc.title,
          text: (obs) => obs.id
        };
      } else if (
        ['phone', 'email', 'address'].indexOf(desc.columnName) !== -1
      ) {
        return {
          title: desc.title,
          columnName: desc.columnName,
          text: (obs) => this.getPatient(obs)['_' + desc.columnName].join('\n')
        };
      } else {
        return desc;
      }
    });

    this._additionalColumns = [];
  }

  /**
   * Returns the name of the Patient who is the subject of the Observation
   * @param {Object} obs
   * @return {string}
   */
  getPatientName(obs) {
    const patientRef = obs.subject.reference;

    return (
      obs.subject.display ||
      (this.refToPatient[patientRef] || {})._name ||
      patientRef
    );
  }

  /**
   * Returns the Patient resource data from the Observation
   * @param {Object} obs
   * @return {Object}
   */
  getPatient(obs) {
    return this.refToPatient[obs.subject.reference] || {};
  }

  /**
   * Returns first CodeableConcept code
   * @param {Object} codeableConcept
   * @return {string|null}
   */
  getCodableConceptCode(codeableConcept) {
    return (
      (codeableConcept &&
        codeableConcept.coding &&
        codeableConcept.coding.length > 0 &&
        codeableConcept.coding[0].code) ||
      null
    );
  }

  /**
   * Returns CodeableConcept display string
   * @param {Object} codeableConcept
   * @return {string|null}
   */
  getDisplayOfCodeableConcept(codeableConcept) {
    return (
      (codeableConcept &&
        (codeableConcept.text ||
          (codeableConcept.coding &&
            codeableConcept.coding.length > 0 &&
            codeableConcept.coding[0].display))) ||
      this.getCodableConceptCode(codeableConcept) ||
      ''
    );
  }

  /**
   * Returns Observation value/unit
   * @param {Object} obs
   * @return {{value: string, unit: string}}
   */
  getObservationValue(obs) {
    const v = this._getValue(obs);
    let result = v ? `${v.value} ${v.unit}` : '';
    (obs.component || []).forEach((component) => {
      obs.code.text || obs.code.coding[0].display;
      const componentCodeDisplay = component.code + ' | ' + this.getDisplayOfCodeableConcept(
        component.code
      );
      const componentValue = this._getValue(component);
      if (result) {
        result += '\n';
      }
      result += `${componentCodeDisplay}: ${componentValue.value} ${componentValue.unit}`;
    });
    return result;
  }

  /**
   * Extracts "value[x]" from the source object
   * @param {Object} obj - an object which may contain property "value[x]"
   * @return {{value: string, unit: string}|null}
   * @private
   */
  _getValue(obj) {
    let result = null;

    Object.keys(obj).some((key) => {
      const valueFound = reValueKey.test(key);
      if (valueFound) {
        const value = obj[key];
        if (key === 'valueQuantity') {
          result = {
            value: value.value,
            unit: value.unit || ''
          };
        } else if (
          key === 'valueCodeableConcept' &&
          value.coding &&
          value.coding.length
        ) {
          result = {
            value: value.text || value.coding[0].display,
            unit: ''
          };
        } else {
          result = {
            value: value,
            unit: ''
          };
        }
      }
      return valueFound;
    });

    return result;
  }

  /**
   * Returns HTML for table header
   * @return {string}
   */
  getHeader() {
    return `<thead><tr><th>${this._getViewCellsTemplate()
      .map((cell) => cell.title)
      .join('</th><th>')}</th></tr></thead>`;
  }

  /**
   * Sets additional column list to display
   * @param {strings[]} columns - array of column names
   */
  setAdditionalColumns(columns) {
    this._additionalColumns = columns || [];
  }

  /**
   * Returns true if item describes a visible column
   * @param {Object} item - one element from mapping object (see this.viewCellsTemplate)
   * @return {boolean}
   * @private
   */
  _filterColumns(item) {
    return (
      (!item.columnName ||
        this._additionalColumns.indexOf(item.columnName) !== -1) &&
      (!item.condition || item.condition())
    );
  }

  /**
   * Returns mapping for each visible cell in a row for display
   * (see description of this.viewCellsTemplate)
   * @return {Object}
   * @private
   */
  _getViewCellsTemplate() {
    return this.viewCellsTemplate.filter(this._filterColumns.bind(this));
  }

  /**
   * Returns mapping for each visible cell in a row for export to CSV-file
   * (see description of this.exportCellsTemplate)
   * @return {Object}
   * @private
   */
  _getExportCellsTemplate() {
    return this.exportCellsTemplate.filter(this._filterColumns.bind(this));
  }

  /**
   * Fill HTML table with observations data
   * @param {{observations: Object[], patients: Object[]}} data - result of requests to server for observations and patients
   * @param {number} perPatientPerTest - limit per patient per test
   * @param {string} serviceBaseUrl - the Service Base URL of the FHIR server from which data is being pulled
   */
  fill({ data, serviceBaseUrl, perPatientPerTest }) {
    let patientToCodeToCount = {};
    const valueSetMapByPath = getCurrentDefinitions().valueSetMapByPath;

    // Prepare data for show & download
    this.serviceBaseUrl = serviceBaseUrl;
    this.valueSetMapByPath = valueSetMapByPath;
    this.refToPatient = data.patients.reduce((refs, patient) => {
      patient._name = humanNameToString(patient.name);
      patient._age = getPatientAge(patient);
      patient._address = addressToStringArray(
        valueSetMapByPath,
        patient.address
      );
      patient._email = getPatientContactsByType(
        valueSetMapByPath,
        patient,
        'email'
      );
      patient._phone = getPatientContactsByType(
        valueSetMapByPath,
        patient,
        'phone'
      );
      refs[`${patient.resourceType}/${patient.id}`] = patient;
      return refs;
    }, {});
    this.data = data.observations.filter((obs) => {
      // Per Clem, we will only show perPatientPerTest results per patient per test.
      const patientRef = obs.subject.reference,
        codeStr = this.getCodableConceptCode(obs.code);
      let codeToCount =
        patientToCodeToCount[patientRef] ||
        (patientToCodeToCount[patientRef] = {});

      // For now skip Observations without a code in the first coding.
      if (codeStr) {
        const codeCount = codeToCount[codeStr] || (codeToCount[codeStr] = 0);
        if (codeCount < perPatientPerTest) {
          ++codeToCount[codeStr];
          return true;
        }
      }
      return false;
    });

    // Update table
    const viewCellsTemplate = this._getViewCellsTemplate();

    document.getElementById(this._id).innerHTML =
      this.getHeader() +
      '<tbody><tr>' +
      this.data
        .map((obs) => {
          return (
            '<td>' +
            viewCellsTemplate
              .map((cell) => cell.text(obs).replace(/\n/g, '<br>'))
              .join('</td><td>') +
            '</td>'
          );
        })
        .join('</tr><tr>') +
      '</tr></tbody>';
  }

  /**
   * Creates Blob for download table
   * @return {Blob}
   */
  getBlob() {
    const cellsTemplate = this._getExportCellsTemplate();
    const header = cellsTemplate.map((cell) => cell.title).join(','),
      rows = this.data.map((obs) => {
        return cellsTemplate
          .map((cell) => {
            const cellText = cell.text(obs);

            if (/["\s\n]/.test(cellText)) {
              return '"' + cellText.replace(/"/, '""') + '"';
            } else {
              return cellText;
            }
          })
          .join(',');
      });

    return new Blob([[header].concat(rows).join('\n')], {
      type: 'text/plain;charset=utf-8',
      endings: 'native'
    });
  }
}
