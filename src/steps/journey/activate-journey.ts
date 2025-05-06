/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';
import * as util from '@run-crank/utilities';
import { baseOperators } from '../../client/constants/operators';
import { isNullOrUndefined } from 'util';

export class ActivateJourney extends BaseStep implements StepInterface {

  protected stepName: string = 'Activate a Salesforce Marketing Cloud journey';
  protected stepExpression: string = 'activate the salesforce marketing cloud journey with id (?<id>[a-zA-Z0-9_-]+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['activate'];
  protected targetObject: string = 'Journey';
  protected expectedFields: Field[] = [
    {
      field: 'id',
      type: FieldDefinition.Type.STRING,
      description: 'ID or Key of the journey to activate',
    },
  ];
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'journey',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'status',
      type: FieldDefinition.Type.STRING,
      description: 'Status of the journey after activation',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const journeyId: string = stepData.id;

    try {
      // First, check if the journey exists
      let existingJourney = await this.client.getJourneyById(journeyId);

      // If not found by ID, try by key
      if (!existingJourney) {
        existingJourney = await this.client.getJourneyByKey(journeyId);
      }

      if (!existingJourney) {
        return this.fail('Journey %s not found', [journeyId]);
      }

      try {
        // Use the journey's actual ID from the found journey
        await this.client.activateJourney(existingJourney.id);
      } catch (activateError) {
        console.error('Activation error:', activateError);

        // Even if we get an error, let's check if the journey was actually activated
        // SFMC sometimes returns errors even when the operation succeeds
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Get the updated journey to check status after a short delay to allow processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      const updatedJourney = await this.client.getJourneyByKey(existingJourney.key);

      if (!updatedJourney) {
        return this.fail('Journey %s not found after activation attempt', [journeyId]);
      }

      const record = this.createRecord(updatedJourney);
      const orderedRecord = this.createOrderedRecord(updatedJourney, stepData['__stepOrder']);

      if (updatedJourney.status === 'Published') {
        return this.pass('Successfully activated journey %s (ID: %s)', [existingJourney.name, existingJourney.id], [record, orderedRecord]);
      } else {
        return this.fail('Journey %s could not be activated. Current status: %s', [existingJourney.name, updatedJourney.status], [record, orderedRecord]);
      }
    } catch (e) {
      return this.error('There was a problem activating the journey: %s', [e.toString()]);
    }
  }

  createRecord(journey: Record<string, any>) {
    return this.keyValue('journey', 'Activated Journey', {
      status: journey.status || 'Unknown',
      id: journey.id,
      key: journey.key,
      name: journey.name,
    });
  }

  createOrderedRecord(journey: Record<string, any>, stepOrder = 1) {
    return this.keyValue(`journey.${stepOrder}`, `Activated Journey from Step ${stepOrder}`, {
      status: journey.status || 'Unknown',
      id: journey.id,
      key: journey.key,
      name: journey.name,
    });
  }
}

export { ActivateJourney as Step };
