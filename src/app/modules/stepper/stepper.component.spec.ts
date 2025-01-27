import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepperComponent } from './stepper.component';
import {
  ConnectionStatus,
  FhirBackendService
} from '../../shared/fhir-backend/fhir-backend.service';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { MockComponent } from 'ng-mocks';
import { SelectColumnsComponent } from '../select-columns/select-columns.component';
import { ViewCohortPageComponent } from '../step-3-view-cohort-page/view-cohort-page.component';
import { PullDataPageComponent } from '../step-4-pull-data-page/pull-data-page.component';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ColumnDescriptionsService } from '../../shared/column-descriptions/column-descriptions.service';
import { ColumnDescription } from '../../types/column.description';
import { SelectOptions } from '../step-1-select-an-area-of-interest/select-an-area-of-interest.component';
import { MatIconTestingModule } from '@angular/material/icon/testing';

@Component({
  selector: 'app-select-an-area-of-interest',
  template: ''
})
// tslint:disable-next-line:component-class-suffix
class SelectAnAreaOfInterestComponentStub {
  option = { value: SelectOptions.Skip };
  SelectOptions = SelectOptions;
  @Input() columnDescriptions: ColumnDescription[];
}

@Component({
  selector: 'app-settings-page',
  template: ''
})
// tslint:disable-next-line:component-class-suffix
class SettingsPageComponentStub {
  settingsFormGroup = new FormBuilder().group({});
}

@Component({
  selector: 'app-define-cohort-page',
  template: ''
})
// tslint:disable-next-line:component-class-suffix
class DefineCohortPageComponentStub {
  defineCohortForm = new FormBuilder().group({
    maxPatientsNumber: ['100', Validators.required]
  });
  patientStream = new Subject<any>();
  @Input() formControl: FormControl;
}

describe('StepperComponent', () => {
  let component: StepperComponent;
  let fhirBackend: FhirBackendService;
  let fixture: ComponentFixture<StepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        StepperComponent,
        MockComponent(SelectColumnsComponent),
        SettingsPageComponentStub,
        DefineCohortPageComponentStub,
        MockComponent(ViewCohortPageComponent),
        MockComponent(PullDataPageComponent),
        MockComponent(MatIcon),
        SelectAnAreaOfInterestComponentStub
      ],
      imports: [
        CommonModule,
        MatStepperModule,
        MatButtonModule,
        NoopAnimationsModule,
        MatIconTestingModule
      ],
      providers: [
        {
          provide: FhirBackendService,
          useValue: {
            initialized: new BehaviorSubject(ConnectionStatus.Ready),
            features: { batch: true },
            disconnect: () => {}
          }
        },
        {
          provide: ColumnDescriptionsService,
          useValue: {
            getVisibleColumns: () => of([])
          }
        }
      ]
    }).compileComponents();
  });

  beforeEach(async () => {
    fhirBackend = TestBed.inject(FhirBackendService);
    spyOn(fhirBackend, 'disconnect').and.callThrough();
    fixture = TestBed.createComponent(StepperComponent);
    component = fixture.componentInstance;
    await fixture.detectChanges();
    spyOn(component.subscription, 'unsubscribe').and.callThrough();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize correctly', () => {
    component.stepper.steps.forEach((step) => {
      // Only the first step is completed
      expect(step.completed).toBe(step === component.stepper.steps.first);
    });
  });

  it('should unsubscribe on destroy', () => {
    component.ngOnDestroy();
    expect(component.subscription.unsubscribe).toHaveBeenCalledOnceWith();
    expect(fhirBackend.disconnect).toHaveBeenCalledOnceWith();
  });
});
