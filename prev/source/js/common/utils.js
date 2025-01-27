import * as moment from 'moment';

// Binding the function Array.prototype.slice.call for convert Array-like objects/collections to a new Array
export const slice = Function.prototype.call.bind(Array.prototype.slice);

/**
 * Builds the human name string from an array of the HumanName elements
 * (see https://www.hl7.org/fhir/datatypes.html#humanname).
 * Returns the name string, or null if one could not be constructed.
 * @param {Object[]} nameElements - an array of the HumanName elements (now we use only the first one)
 * @return {string|null}
 */
export function humanNameToString(nameElements) {
  let rtn;
  const name = nameElements && nameElements[0];

  if (name) {
    const given = name.given || [],
      firstName = given[0] || '',
      lastName = name.family || '';
    let middleName = given[1] || '';

    if (middleName.length === 1) {
      middleName += '.';
    }
    rtn = [firstName, middleName, lastName].filter((item) => item).join(' ');
  }

  return rtn || null;
}

/**
 * Get autocompleter associated with an input element by its id
 * @param {string} inputId
 * @return {Object}
 */
export function getAutocompleterById(inputId) {
  const element = document.getElementById(inputId);

  return element && element.autocomp;
}

/**
 * Returns an object with values from autocompleter, useful for restoring
 * the state of autocompleter (see addAutocompleterRawDataById).
 * @param {string} inputId
 * @return {{codes: *, items: *}}
 */
export function getAutocompleterRawDataById(inputId) {
  const autocompleter = getAutocompleterById(inputId);
  const codes = autocompleter.getSelectedCodes();
  const items = autocompleter.getSelectedItems();
  return { codes, items };
}

/**
 * Restores the state of autocompleter with the object retrieved by calling
 * getRawControls. Autocompleter must be empty (just created).
 * @param {string} inputId
 * @param {{codes: *, items: *}} rawData
 */
export function addAutocompleterRawDataById(inputId, rawData) {
  const autocompleter = getAutocompleterById(inputId);
  const { codes, items } = rawData;

  items.forEach((item, index) => {
    autocompleter.storeSelectedItem(item, codes[index]);
    autocompleter.addToSelectedArea(item);
  });
}

/**
 * Returns the array of address string from FHIR Address type
 * (see https://www.hl7.org/fhir/datatypes.html#address)
 * @param {Object} valueSetMapByPath - map from path to value set map
 * @param {Object[]} addressElements - an array of the Address elements
 * @example usage of addressToStringArray
 * // calling a function as shown below will return this array:
 * // [
 * //   'Home: 49 Meadow St, Mounds, OK, 74047, USA',
 * //   'Work: 27 South Ave, Tulsa, OK, 74126, USA',
 * //   'Billing: 1 Hill St, Tulsa, OK, 74108, USA'
 * // ]
 * addressToStringArray(
 *   {
 *     "Patient.address.use": {
 *       home: "Home",
 *       work: "Work",
 *       billing: "Billing",
 *     },
 *   },
 *   [
 *     {
 *       use: "home",
 *       line: "49 Meadow St",
 *       city: "Mounds",
 *       state: "OK",
 *       postalCode: "74047",
 *       country: "USA",
 *     },
 *     {
 *       use: "work",
 *       line: "27 South Ave",
 *       city: "Tulsa",
 *       state: "OK",
 *       postalCode: "74126",
 *       country: "USA",
 *     },
 *     {
 *       use: "billing",
 *       line: "1 Hill St",
 *       city: "Tulsa",
 *       state: "OK",
 *       postalCode: "74108",
 *       country: "USA",
 *     }
 *   ]
 * );
 * @return {String[]}
 */
export function addressToStringArray(valueSetMapByPath, addressElements) {
  return (addressElements || [])
    .map((address) => {
      if (!address) {
        return '';
      }
      const addressString = [
        address.line,
        address.city,
        address.state,
        address.postalCode,
        address.country
      ]
        .filter((item) => item)
        .join(', ');
      return address.use
        ? `${
            valueSetMapByPath['Patient.address.use'][address.use]
          }: ${addressString}`
        : addressString;
    })
    .filter((item) => item);
}

/**
 * Returns the age of the Patient from the Patient Resource
 * @param {Object} res the Patient resource
 * @return {number|undefined}
 */
export function getPatientAge(res) {
  const birthDateStr = res.birthDate;
  if (birthDateStr) {
    return Math.floor(
      moment.duration(moment().diff(new Date(birthDateStr))).asYears()
    );
  }
}

/**
 * Returns a list of emails/phones for the Email/Phone table column from the Patient Resource
 * @param {Object} valueSetMapByPath - map from path to value set map
 * @param {Object} res the Patient resource
 * @param {String} system 'email'/'phone'
 * @return {String[]}
 */
export function getPatientContactsByType(valueSetMapByPath, res, system) {
  return (res.telecom || [])
    .filter((item) => item.system === system)
    .map((item) => {
      const use = valueSetMapByPath['Patient.telecom.use'][item.use];
      return `${use ? use + ': ' : ''} ${item.value}`;
    });
}

/**
 * Adds/removes the CSS class for element(s) corresponding to the "selector"
 * depending on the "state" parameter boolean value.
 * If the "state" parameter value is not specified (or not boolean value),
 * this means that the presence of the CSS class should be inverted.
 * Returns new "state" of the last element corresponding to the "selector".
 * @param {string|NodeList|Array<HTMLElement>|HTMLElement} selector - CSS selector, HTMLElement or HTMLElement collection
 * @param {string} cssClass - CSS class
 * @param {boolean} [state] - true - add CSS class, false - remove CSS class, other value is to invert the CSS class presence
 * @return {boolean|undefined}
 */
export function toggleCssClass(selector, cssClass, state) {
  let resultState = undefined;
  const elements =
    selector instanceof HTMLElement
      ? [selector]
      : slice(
          selector instanceof NodeList || selector instanceof Array
            ? selector
            : document.querySelectorAll(selector)
        );
  const hasClassRegExp = new RegExp(`(\\s+|^)${cssClass}\\b`);

  elements.forEach((element) => {
    const className = element.className;
    const currentState = hasClassRegExp.test(className);
    if (currentState === state) {
      resultState = currentState;
      // nothing to change
      return;
    }

    element.className = currentState
      ? className.replace(hasClassRegExp, '')
      : className + ' ' + cssClass;
    resultState = !currentState;
  });

  return resultState;
}

/**
 * Adds the CSS class for element(s) corresponding to the "selector".
 * @param {string|NodeList|Array<HTMLElement>|HTMLElement} selector - CSS selector, HTMLElement or HTMLElement collection
 * @param {string} cssClass - CSS class
 */
export function addCssClass(selector, cssClass) {
  toggleCssClass(selector, cssClass, true);
}

/**
 * Removes the CSS class for element(s) corresponding to the "selector".
 * @param {string|NodeList|Array<HTMLElement>|HTMLElement} selector - CSS selector, HTMLElement or HTMLElement collection
 * @param {string} cssClass - CSS class
 */
export function removeCssClass(selector, cssClass) {
  toggleCssClass(selector, cssClass, false);
}

/**
 * Returns the input string value with the first letter converted to uppercase
 * @param {string} str - input string
 * @return {string}
 */
export function capitalize(str) {
  return str && str.charAt(0).toUpperCase() + str.substring(1);
}

/**
 * Escapes a FHIR search parameter string
 * (see https://www.hl7.org/fhir/search.html#escaping)
 * @param {string} str
 * @return {string}
 */
export function escapeFhirSearchParameter(str) {
  return str.replace(/[$,|]/g, '\\$&');
}

/**
 * Escapes a FHIR search parameter string then encode it with encodeURIComponent
 * (see https://www.hl7.org/fhir/search.html#escaping)
 * @param {string} str
 * @return {string}
 */
export function encodeFhirSearchParameter(str) {
  return encodeURIComponent(escapeFhirSearchParameter(str));
}

/**
 * Prepares a string for insertion into a regular expression
 * @param {string} str
 * @return {string}
 */
export function escapeStringForRegExp(str) {
  return str.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, '\\$&');
}

/**
 * Returns the date from a date input field appended with a time string if passed
 * @param {string} selector - css selector for getting date input field element
 * @param {string} [timeString] - time string to add
 * @return {string}
 */
export function getDateTimeFromInput(selector, timeString = null) {
  const input = document.querySelector(selector);

  if (input && input.validity.valid && input.value) {
    return input.value + (timeString ? 'T' + timeString : '');
  }

  return '';
}

const focusableSelector = [
  '*[tabIndex]:not([tabIndex="-1"])',
  'a[href]:not([disabled])',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input[type="text"]:not([disabled])',
  'input[type="radio"]:not([disabled])',
  'input[type="checkbox"]:not([disabled])',
  'select:not([disabled])'
].join(',');

/**
 * Returns true if element is visible
 * @param {HTMLElement} element
 * @return {boolean}
 */
function isVisible(element) {
  return window.getComputedStyle(element).display !== 'none';
}

/**
 * Returns focusable children of element
 * @param {HTMLElement} element
 * @return {HTMLElement[]}
 */
export function getFocusableChildren(element) {
  return [].slice
    .call(element.querySelectorAll(focusableSelector))
    .filter((child) => isVisible(child));
}
/**
 * The Tab and Shift+Tab keys will cycle through the focusable elements within a DOM node.
 * @param {HTMLElement} popupElement - DOM node
 * @param {Function} onEscape - callback if ESC key pressed
 * @return {function(): void} - returns a function to cancel the focus control
 */
export function trapFocusInPopup(popupElement, onEscape) {
  const focusableEls = getFocusableChildren(popupElement);
  const firstFocusableEl = focusableEls[0];
  const lastFocusableEl = focusableEls[focusableEls.length - 1];
  const prevFocusedElement = document.activeElement;

  // Remove focus from outside of the popup
  firstFocusableEl.focus();
  // Don't focus inside a popup without a click or TAB
  firstFocusableEl.blur();

  function trapFn(e) {
    const isTabPressed = e.key === 'Tab' || e.key === 'Tab';

    if (!isTabPressed) {
      if (e.key === 'Esc' || e.key === 'Escape') {
        onEscape();
      }
      return;
    }

    const activeElement =
      focusableEls.indexOf(document.activeElement) === -1
        ? null
        : document.activeElement;

    if (e.shiftKey) {
      if (!activeElement || activeElement === firstFocusableEl) {
        lastFocusableEl.focus();
        e.preventDefault();
      }
    } else {
      if (!activeElement || activeElement === lastFocusableEl) {
        firstFocusableEl.focus();
        e.preventDefault();
      }
    }
  }

  document.addEventListener('keydown', trapFn);

  return function () {
    document.removeEventListener('keydown', trapFn);
    // Restore focus after closing the popup
    prevFocusedElement && prevFocusedElement.focus();
  };
}

/**
 * Returns value from Object by path
 * @param {Object} value - input Object
 * @param {Array} path - array of property names
 * @return {*}
 */
export function getValueByPath(value, path) {
  let i = 0;
  while (value && i < path.length) {
    value = value[path[i]];
    i++;
  }
  return value;
}
