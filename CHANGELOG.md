# Change Log

This log documents the significant changes for each release.
This project follows [Semantic Versioning](http://semver.org/).

## [3.11.0] - 2021-07-28
### Added  
- List of units for LOINC codes from CTSS.

## [3.10.1] - 2021-07-28
### Changed  
- Added descriptions for search parameter names.
- Renamed "Test value prefix" and "Test value modifier" to "Comparator".
- The default comparator for the test value is "=".

## [3.10.0] - 2021-07-28
### Added
- Patient Id column to ResearchStudy table in the step of pulling data
  for cohort

## [3.9.0] - 2021-07-23
### Changed
- Search criteria in Define Cohort step now has categorized structure based
  on resource types.
- "Observation by Test" is now combined into "Observation" resource type
  as parameter name "code text".
- Removed the date fields in "code text" search parameter.

## [3.8.0] - 2021-07-23
### Changed
- Hide Research Study step if server has no Research Study data.

## [3.7.0] - 2021-07-23
### Changed
- Automatically fallback to single requests if batching is not supported.

## [3.6.1] - 2021-07-22
### Changed
- Show Patient id (dbGaP)
- Store visible table columns for each service base URL separately

## [3.6.0] - 2021-07-22
### Added
- Limit list of resources to what has data (dbGaP).
### Fixed
- It was possible to switch to the View cohort step without
  searching for Patients.

## [3.5.1] - 2021-07-22
### Fixed
- README.md

## [3.5.0] - 2021-07-12
### Added
- Functionality to save cohort data and criteria into file.
- Functionality to load cohort data and criteria from file.

## [3.4.1] - 2021-07-06
### Fixed
- Slowness to load Patients from a ResearchStudy.

## [3.4.0] - 2021-07-06
### Added
- When searching for observation codes, the system now tries to match code
  as well as text. A code will be returned if user input matches exactly the
  code, or part of the code text.

## [3.3.0] - 2021-07-06
### Added
- User can now pull data for Patient the same way as other resource types.

## [3.2.0] - 2021-07-02
### Changed
- After user enters a date range value, the application will use that as
  default value for later date range controls. Refreshing page will clear
  the default value.

## [3.1.2] - 2021-06-28
### Added
- User input to define number of resources per patient for all resource types
  in Pull Data step.

## [3.1.1] - 2021-06-24
### Changed
- When user searches for active patients, the application now tries to also
  return patients without the 'active' field defined.

## [3.1.0] - 2021-06-24
### Added
- Filtering of values in the ResearchStudy.condition column by preferred code
  system.
- Columns for research study content (dbGap only).
- Option to filter ResearchStudies if the user has access to their data.
### Fixed
- Detection of columns visible by default.
- Requests to the FHIR server without endpoint - they cannot be combined
  into a batch request.
- Title of the configure columns dialog.

## [3.0.0] - 2021-06-14
### Changed
- The application has been rewritten to use Angular.
- The new application uses a wizard-like workflow - content is divided into
  logical steps.

## [2.6.1] - 2021-05-24
### Fixed
- Speed up initialization by replacing "_sort=date" with "date=gt1000-01-01"
  in the init query which is used to check if sorting Observations by date
  is supported.

## [2.6.0] - 2021-03-08
### Added
- $lastn lookup of Observation codes, when supported
### Fixed
- It was possible to select the same criteria after loading the cohort criteria
- Displaying Observation component values

## [2.5.0] - 2021-02-18
### Added
- ResearchStudy for cohort selection
- Spinner when loading data

## [2.4.0] - 2020-12-18
### Added
- Support for age-at-event search parameter extension
- Display Observation value from component property
- The ability to enter a floating point Observation value in search parameters
- Advanced settings section
### Changed
- Sort Observations by date only if possible

## [2.3.0] - 2020-12-18
### Added
- Handle 429 responses with rate limiting
## Changed
- Resource type field value is empty by default

## [2.2.0] - 2020-12-02
### Added
- Column selection for resource tables
- Allowed non-LOINC codes to be entered in Patient selection criteria
- Added description for each step

## [2.1.0] - 2020-11-19
### Added
- Reuse selection criteria values from the Patient selection area
- Notes to screen reader log when adding/removing elements
### Fixed
- Observation list does not match term after selection

## [2.0.0] - 2020-11-06
### Added
- Save/Load Cohort criteria
- Version number to html page

## [1.15.0] - 2020-10-30
### Added
- Build/Load Cohort (instead of Patient selection)
## Changed
- Allow patients to be selected by Observation codes which do not have
  values provided for them
- Changed the Patient.active parameter input control from a checkbox to
  a radio button group
## Fixed
- Exception that can be thrown after removing a resource type tab
- Results of not all queries were considered when filtering patient resources
- Extra commas in http requests for data needed for resource tabs

## [1.14.0] - 2020-10-16
### Added
- Allowance to choose which resource types users want to see
  for selected patients

## [1.13.0] - 2020-09-08
### Added
- Display of minimum and maximum values that exist in the database
  for a date range criterion
- npm task "show-webpack-treemap" to run webpack-bundle-analyzer
### Changed
- Bundle size reduced by removing moment locales

## [1.12.0] - 2020-08-24
### Changed
- Revised Observation criteria for Patient selection

## [1.11.2] - 2020-08-14
### Fixed
- Issue with parse batch response
- Issue with partial support of Promise in some Edge versions

## [1.11.1] - 2020-08-12
### Fixed
- Duplication of the search criteria component when changing the server
- Batch tuning applies only after server change

## [1.11.0] - 2020-08-03
### Added
- Display that criteria are combined with logical AND
### Fixed
- Issue with value sets that are used more than once

## [1.10.0] - 2020-07-29
### Added
- Allow other resources to be used to select patients

## [1.9.0] - 2020-07-20
### Changed
- Resource ValueSets are built from the FHIR spec downloads

## [1.8.0] - 2020-07-02
### Added
- Allowed searching of any searchable Condition, Observation or MedicationDispense field

## [1.7.0] - 2020-06-16
### Added
- Separate Patient selection section
- Statistical data loading information

## [1.6.0] - 2020-05-14
### Changed
- Allowed searching of any searchable Encounter field

## [1.5.0] - 2020-05-06
### Changed
- Allowed searching of any searchable Patient field
- Added display of data loading time

## [1.4.0] - 2020-04-23
### Changed
- Allowed selection of patients by gender and age

## [1.3.0] - 2020-04-14
### Changed
- Issues queries per each selected patient
- Added the ability to automatically combine requests in a batch
- No cache used for http errors

## [1.2.1] - 2020-04-09
### Changed
- separate configurations for production and development

## [1.2.0] - 2020-04-03
### Changed
- Added output fields

## [1.1.0] - 2020-03-20
### Changed
- Added button to download observations in CSV format.
- Some markup issues fixed

## [1.0.2] - 2019-09-17
### Changed
- Set the default test/category radio button selection to 'test'

## [1.0.1] - 2019-09-10
### Added
- Support for searching by categories.  The category list includes a mixture of
  categories from the Observation category list and the DiagnosticReport
  category list, with a few modifications.
- A cache for the AJAX requests.
