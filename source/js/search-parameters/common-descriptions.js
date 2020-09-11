import { FhirBatchQuery } from '../common/fhir-batch-query';
import {
  encodeFhirSearchParameter,
  getAutocompleterById,
  capitalize,
  toggleCssClass
} from '../common/utils';
import definitionsIndex from './definitions/index.json';

// Common FhirBatchQuery to execute queries from search parameter controls
let client;

// FHIR version
let fhirVersion;

/**
 * Returns version name by version number or null if version number is not supported.
 * @example
 * // calling a function as shown below will return this string: 'R4'
 * getVersionNameByNumber('4.0.1')
 * @param versionNumber
 * @return {string|null}
 */
export function getVersionNameByNumber(versionNumber) {
  let versionName = null;

  Object.keys(definitionsIndex.versionNameByVersionNumberRegex).some(
    (versionRegEx) => {
      if (new RegExp(versionRegEx).test(versionNumber)) {
        versionName =
          definitionsIndex.versionNameByVersionNumberRegex[versionRegEx];
        return true;
      }
    }
  );

  return versionName;
}

const _searchParamGroupFactoriesByResourceTypes = {};

/**
 * Generates search parameters description by resource type from data imported
 * from FHIR specification on build step by webpack loader.
 * Available resource types are specified in webpack.common.js
 * @param {string} resourceType - resource type for which you want to generate
 *                 search parameters
 * @return {Function}
 */
export function getSearchParamGroupFactoryByResourceType(resourceType) {
  let factory = _searchParamGroupFactoriesByResourceTypes[resourceType];
  if (!factory) {
    factory = _searchParamGroupFactoriesByResourceTypes[resourceType] = () => ({
      resourceType: resourceType,
      description: {
        ...defaultParameters(resourceType)
      }
    });
  }
  return factory;
}

/**
 * Sets FHIR REST API Service Base URL for search parameters.
 * This URL uses to create internal FhirBatchQuery instance
 * which is used when a search parameter autocompleter requests
 * a list of possible values (see function referenceParameters below).
 * @param {string} serviceBaseUrl
 * @return {Promise}
 */
export function setFhirServerForSearchParameters(serviceBaseUrl) {
  client = null;
  const newClient = new FhirBatchQuery({
    serviceBaseUrl,
    maxRequestsPerBatch: 1
  });
  return newClient.getWithCache('metadata').then(({ data }) => {
    fhirVersion = data.fhirVersion;
    if (!getVersionNameByNumber(fhirVersion)) {
      return Promise.reject({
        error: 'Unsupported FHIR version: ' + fhirVersion
      });
    } else {
      client = newClient;
    }
  });
}

export function getCurrentClient() {
  return client;
}

/**
 * Returns definitions for current FHIR version
 * @return {Object}
 */
export function getCurrentDefinitions() {
  const versionName = getVersionNameByNumber(fhirVersion);
  const definitions = definitionsIndex.configByVersionName[versionName];

  if (!definitions.initialized) {
    // prepare definitions on first request
    const valueSets = definitions.valueSets;
    const valueSetMaps = (definitions.valueSetMaps = Object.keys(
      valueSets
    ).reduce((_valueSetsMap, entityName) => {
      _valueSetsMap[entityName] =
        typeof valueSets[entityName] === 'string'
          ? valueSets[entityName]
          : valueSets[entityName].reduce((_entityMap, item) => {
              _entityMap[item.code] = item.display;
              return _entityMap;
            }, {});
      return _valueSetsMap;
    }, {}));

    Object.keys(definitions.valueSetByPath).forEach((path) => {
      definitions.valueSetMapByPath[path] =
        valueSetMaps[definitions.valueSetByPath[path]];
      definitions.valueSetByPath[path] =
        valueSets[definitions.valueSetByPath[path]];
    });
    definitions.initialized = true;
  }

  return definitions;
}

/**
 * Generates boolean parameter description
 * @param {string} description - description for checkbox field,
 * @param {Object} column - HTML table column name
 * @param {string} name - name of search parameter to construct result query string
 * @return {Object}
 */
function booleanParameterDescription({ description, column, name }) {
  return {
    column,
    getControlsHtml: (searchItemId) =>
      `<label class="boolean-param"><input id="${searchItemId}-${name}" type="checkbox">${description}</label>`,
    getCondition: (searchItemId) =>
      `&${name}=${document.getElementById(`${searchItemId}-${name}`).checked}`
  };
}

/**
 * Generates string parameter description
 * @param {string} placeholder - placeholder for input field,
 * @param {Object} column - HTML table column name
 * @param {string} name - name of search parameter to construct result query string
 * @return {Object}
 */
function stringParameterDescription({ placeholder, column, name }) {
  return {
    column,
    getControlsHtml: (searchItemId) =>
      `<input type="text" id="${searchItemId}-${name}" placeholder="${placeholder}" title="${placeholder}">`,
    getCondition: (searchItemId) => {
      const value = document.getElementById(`${searchItemId}-${name}`).value;
      return value.trim() ? `&${name}=${encodeFhirSearchParameter(value)}` : '';
    }
  };
}

/**
 * Generates date parameter description
 * @param {string} description - title for input field,
 * @param {Object} column - HTML table column name
 * @param {string} name - name of search parameter to construct result query string
 * @param {string} elementPath - resource element path
 * @param {string} resourceType - resource type, e.g. 'Patient', 'Encounter'
 * @return {Object}
 */
function dateParameterDescription({
  name,
  column,
  description,
  elementPath,
  resourceType
}) {
  return {
    column,
    getControlsHtml: (searchItemId) => {
      const title = (description && description.replace(/"/g, '&quot;')) || '';
      return `\
<span>from</span><input type="date" id="${searchItemId}-${name}-from" placeholder="yyyy-mm-dd" title="${title}">
<span>to</span><input type="date" id="${searchItemId}-${name}-to" placeholder="yyyy-mm-dd" title="${title}">`;
    },
    attachControls: (searchItemId) => {
      const fromId = `${searchItemId}-${name}-from`;
      const toId = `${searchItemId}-${name}-to`;

      if (elementPath && resourceType) {
        switchLoadingStatus(searchItemId, true);
        Promise.all(
          [
            loadDate(fromId, resourceType, name, elementPath, LOAD_DATE_MODE.MIN),
            loadDate(toId, resourceType, name, elementPath, LOAD_DATE_MODE.MAX)
          ].map((i) =>
            // Convert reject to resolve to emulate Promise.allSettled behaviour (for IE11)
            i.catch((error) => error)
          )
        ).then(() => switchLoadingStatus(searchItemId, false));
      }
    },
    getCondition: (searchItemId) => {
      const from = document.getElementById(`${searchItemId}-${name}-from`)
        .value;
      const to = document.getElementById(`${searchItemId}-${name}-to`).value;

      return (
        (from ? `&${name}=ge${encodeFhirSearchParameter(from)}` : '') +
        (to ? `&${name}=le${encodeFhirSearchParameter(to)}` : '')
      );
    }
  };
}

// An enumeration containing the possible modes of operation of the loadDate function
const LOAD_DATE_MODE = Object.freeze({
  MIN: 0,
  MAX: 1
});

/**
 * Load default minimum(or maximum) date value to input field from database.
 * @param {string} inputId - input field id
 * @param {string} resourceType - resource type
 * @param {string} paramName - search parameter name
 * @param {string} resourceElementPath - resource element path
 * @param {LOAD_DATE_MODE} mode - LOAD_DATE_MODE.MIN to fill input with minimum value,
 *                                LOAD_DATE_MODE.MAX to fill input with maximum value.
 */
function loadDate(inputId, resourceType, paramName, resourceElementPath, mode) {
  const elementPath = resourceElementPath.split('.');

  return getCurrentClient()
    .getWithCache(
      `${resourceType}?_count=1&_elements=${elementPath[0]}&_sort=${
        (mode === LOAD_DATE_MODE.MIN ? '' : '-') + paramName
      }`
    )
    .then(({ status, data }) => {
      if (status === 200 && data.entry && data.entry.length) {
        let value = getValueByPath(data.entry[0].resource, elementPath);
        if (value && (value.start || value.end)) {
          value = mode === LOAD_DATE_MODE.MIN ? value.start || value.end : value.end || value.start;
        }
        const date = /^(\d{4})(-\d{2}-\d{2}|$)/.test(value)
          ? `${RegExp.$1}${RegExp.$2 || '-01-01'}`
          : null;
        if (date) {
          updateInputIfExist(inputId, date);
        }
      }
    });
}

/**
 * Returns value from Object by path
 * @param {Object} value - input Object
 * @param {Array} path - array of property names
 * @return {*}
 */
function getValueByPath(value, path) {
  let i = 0;
  while (value && i < path.length) {
    value = value[path[i]];
    i++;
  }
  return value;
}

/**
 * Changes input field value if exists
 * @param {string} inputId
 * @param {string} value
 */
function updateInputIfExist(inputId, value) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = value;
  }
}

/**
 * Shows/hides search parameter controls with a spinner depending on the boolean parameter "loading".
 * @param {string} searchItemId
 * @param {boolean} loading
 */
function switchLoadingStatus(searchItemId, loading) {
  const content = document.getElementById(searchItemId + '_content');
  if (content) {
    toggleCssClass(content, 'spinner', loading);
  }
}

/**
 * Generates ValueSet parameter description
 * @param {string} placeholder - placeholder for input field,
 * @param {string} name - name of search parameter to construct result query string
 * @param {Object} column - HTML table column name
 * @param {Array<{display: string, code: string}>|string} list - array of predefined values or value path to get list from FHIR specification
 * @return {Object}
 */
function valuesetParameterDescription({ placeholder, name, column, list }) {
  if (typeof list === 'string') {
    list = getCurrentDefinitions().valueSetByPath[list];
  }
  return {
    column: column,
    getControlsHtml: (searchItemId) =>
      `<input type="text" id="${searchItemId}-${name}" placeholder="${placeholder}">`,
    attachControls: (searchItemId) => {
      new Def.Autocompleter.Prefetch(
        `${searchItemId}-${name}`,
        list.map((item) => item.display),
        {
          codes: list.map(
            (item) => (item.system ? item.system + '|' : '') + item.code
          ),
          maxSelect: '*',
          matchListValue: true
        }
      );
    },
    detachControls: (searchItemId) => {
      getAutocompleterById(`${searchItemId}-${name}`).destroy();
    },
    getCondition: (searchItemId) => {
      const codes = getAutocompleterById(`${searchItemId}-${name}`)
        .getSelectedCodes()
        .map((code) => encodeFhirSearchParameter(code))
        .join(',');
      return codes ? `&${name}=${codes}` : '';
    }
  };
}

/**
 * Generates search parameters from data imported from FHIR specification on build step by webpack loader.
 * Available resource types are specified in webpack.common.js
 * @param {string} resourceType - resource type for which you want to generate search parameters
 * @param {Object} searchNameToColumn - mapping from search parameter names to HTML table column names
 * @param {Array<string>} skip - an array of search parameter names to skip, if you want to define them manually
 * @return {Object}
 */
export function defaultParameters(
  resourceType,
  { searchNameToColumn = {}, skip = [] } = {}
) {
  const definitions = getCurrentDefinitions();
  const valueSets = definitions.valueSets;

  return definitions.resources[resourceType].reduce((_parameters, item) => {
    if (skip.indexOf(item.name) === -1) {
      const displayName = capitalize(item.name).replace(/-/g, ' ');
      const placeholder = item.description;
      const name = item.name;

      switch (item.type) {
        case 'date':
        case 'dateTime':
          _parameters[displayName] = dateParameterDescription({
            description: item.description,
            name,
            column: searchNameToColumn[name] || name,
            elementPath: getElementPathFromExpression(
              resourceType,
              item.expression
            ),
            resourceType
          });
          break;
        case 'boolean':
          _parameters[displayName] = booleanParameterDescription({
            description: item.description,
            name,
            column: searchNameToColumn[name] || name
          });
          break;
        // TODO: find a way to support other types
        default:
          if (item.valueSet && valueSets[item.valueSet] instanceof Array) {
            // Static ValueSet specified in FHIR specification
            _parameters[displayName] = valuesetParameterDescription({
              placeholder,
              name,
              column: searchNameToColumn[name] || name,
              list: valueSets[item.valueSet]
            });
          } else {
            // all other criteria are considered to have a string type
            _parameters[displayName] = stringParameterDescription({
              placeholder,
              name,
              column: searchNameToColumn[name] || name
            });
          }
      }
    }

    return _parameters;
  }, {});
}

/**
 * Determines resource element path by expression from resource search parameter specification.
 * @param {string} resourceType
 * @param {string} expression
 * @return {string}
 */
function getElementPathFromExpression(resourceType, expression) {
  let s = new RegExp(`${resourceType}\\.([^\\s]*)`).test(expression)
    ? RegExp.$1
    : null;

  if (/^(.*).as\((.*)\)$/.test(s)) {
    return RegExp.$1 + capitalize(RegExp.$2);
  }

  return s;
}

/**
 * Generates string parameter descriptions
 * @param {Array[]} descriptions - an array of descriptions, each of which is an array containing the following elements:
 *                  displayName - parameter display name,
 *                  placeholder - placeholder for input field,
 *                  name - name of search parameter to construct result query string
 * @param {Object} searchNameToColumn - mapping from search parameter names to HTML table column names
 * @return {Object}
 */
export function stringParameters(descriptions, searchNameToColumn) {
  return descriptions.reduce(
    (_parameters, [displayName, placeholder, name]) => {
      _parameters[displayName] = stringParameterDescription({
        placeholder,
        name,
        column: searchNameToColumn[name] || name
      });
      return _parameters;
    },
    {}
  );
}

/**
 * Generates descriptions for parameters with a predefined set of values
 * @param {Array[]} descriptions - an array of descriptions, each of which is an array containing the following elements:
 *                  displayName - parameter display name,
 *                  placeholder - placeholder for input field,
 *                  name - name of search parameter to construct result query string
 *                  list - array of predefined values or value path to get list from FHIR specification
 * @param {Object} searchNameToColumn - mapping from search parameter names to HTML table column names
 * @return {Object}
 */
export function valueSetsParameters(descriptions, searchNameToColumn) {
  return descriptions.reduce(
    (_parameters, [displayName, placeholder, name, list]) => {
      _parameters[displayName] = valuesetParameterDescription({
        placeholder,
        name,
        column: searchNameToColumn[name] || name,
        list
      });
      return _parameters;
    },
    {}
  );
}

/**
 * Generates date parameter descriptions
 * @param {Array[]} descriptions - an array of descriptions, each of which is an array containing the following elements:
 *                  displayName - parameter display name,
 *                  name - name of search parameter to construct result query string
 *                  elementPath - resource element path
 * @param {Object} searchNameToColumn - mapping from search parameter names to HTML table column names
 * @param {string} resourceType - resource type, e.g. 'Patient', 'Encounter'
 * @return {Object}
 */
export function dateParameters(descriptions, searchNameToColumn, resourceType) {
  return descriptions.reduce(
    (_parameters, [displayName, name, elementPath]) => {
      _parameters[displayName] = dateParameterDescription({
        name,
        column: searchNameToColumn[name] || name,
        elementPath,
        resourceType
      });

      return _parameters;
    },
    {}
  );
}

/**
 * Generates descriptions for parameters with a set of loadable values
 * @param {Array[]} descriptions - an array of descriptions, each of which is an array containing the following elements:
 *                  displayName - parameter display name,
 *                  placeholder - placeholder for input field,
 *                  resourceType - FHIR resource type,
 *                  filterName - query parameter name for filtering resources by string,
 *                  itemToString - function to convert an resource item to a string,
 *                  name - name of search parameter to construct result query string
 * @param {Object} searchNameToColumn - mapping from search parameter names to HTML table column names
 * @return {Object}
 */
export function referenceParameters(descriptions, searchNameToColumn) {
  return descriptions.reduce(
    (
      _parameters,
      [displayName, placeholder, resourceType, filterName, itemToString, name]
    ) => {
      _parameters[displayName] = {
        column: searchNameToColumn[name] || name,
        getControlsHtml: (searchItemId) =>
          `<input type="text" id="${searchItemId}-${name}" placeholder="${placeholder}">`,
        attachControls: (searchItemId) => {
          new Def.Autocompleter.Search(`${searchItemId}-${name}`, null, {
            fhir: {
              search: function (fieldVal, count) {
                return {
                  then: function (success, error) {
                    getCurrentClient()
                      .getWithCache(
                        `${resourceType}?${filterName}=${fieldVal}&_count=${count}`
                      )
                      .then(({ status, data }) => {
                        if (status === 200) {
                          success({
                            resourceType: 'ValueSet',
                            expansion: {
                              total: data.total,
                              contains: (data.entry || []).map((item) => ({
                                code:
                                  /*resourceType + '/' + */ item.resource.id,
                                display: itemToString(item)
                              }))
                            }
                          });
                        } else {
                          error(data);
                        }
                      });
                  }
                };
              }
            },
            maxSelect: '*',
            matchListValue: true
          });
        },
        detachControls: (searchItemId) => {
          getAutocompleterById(`${searchItemId}-${name}`).destroy();
        },
        getCondition: (searchItemId) => {
          const codes = getAutocompleterById(`${searchItemId}-${name}`)
            .getSelectedCodes()
            .map((code) => encodeFhirSearchParameter(code))
            .join(',');
          return codes ? `&${name}=${codes}` : '';
        }
      };
      return _parameters;
    },
    {}
  );
}
