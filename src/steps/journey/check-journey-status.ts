/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';
import * as util from '@run-crank/utilities';
import { baseOperators } from '../../client/constants/operators';
import { isNullOrUndefined } from 'util';

export class CheckJourneyStatus extends BaseStep implements StepInterface {

  protected stepName: string = 'Check a Salesforce Marketing Cloud journey status';
  protected stepExpression: string = 'the salesforce marketing cloud journey with id (?<journeyId>[a-zA-Z0-9_-]+) should have status (?<expectedStatus>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected actionList: string[] = ['check'];
  protected targetObject: string = 'Journey';
  protected expectedFields: Field[] = [
    {
      field: 'journeyId',
      type: FieldDefinition.Type.STRING,
      description: 'ID or Key of the journey to check',
    },
    {
      field: 'expectedStatus',
      type: FieldDefinition.Type.STRING,
      description: 'Expected status of the journey',
    },
  ];
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'journey',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'status',
      type: FieldDefinition.Type.STRING,
      description: 'Status of the journey',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const journeyId: string = stepData.journeyId;
    const expectedStatus: string = stepData.expectedStatus;

    try {
      // First check if journey exists by ID
      let journey = await this.client.getJourneyById(journeyId);

      // If not found by ID, try by key
      if (!journey) {
        journey = await this.client.getJourneyByKey(journeyId);
      }

      if (!journey) {
        return this.fail('Journey %s not found', [journeyId]);
      }

      // Get the actual status from the journey
      const actualStatus = journey.status;

      if (actualStatus === expectedStatus) {
        const record = this.createRecord(journey);
        const orderedRecord = this.createOrderedRecord(journey, stepData['__stepOrder']);

        return this.pass('Journey %s has expected status %s', [journeyId, expectedStatus], [record, orderedRecord]);
      } else {
        const record = this.createRecord(journey);
        const orderedRecord = this.createOrderedRecord(journey, stepData['__stepOrder']);

        return this.fail('Expected journey %s to have status %s, but got %s', [journeyId, expectedStatus, actualStatus], [record, orderedRecord]);
      }
    } catch (e) {
      return this.error('There was a problem checking the journey status: %s', [e.toString()]);
    }
  }

  createRecord(journey: Record<string, any>) {
    return this.keyValue('journey', 'Journey', {
      status: journey.status,
      id: journey.id,
      key: journey.key,
      name: journey.name,
    });
  }

  createOrderedRecord(journey: Record<string, any>, stepOrder = 1) {
    return this.keyValue(`journey.${stepOrder}`, `Journey from Step ${stepOrder}`, {
      status: journey.status,
      id: journey.id,
      key: journey.key,
      name: journey.name,
    });
  }
}

export { CheckJourneyStatus as Step };
