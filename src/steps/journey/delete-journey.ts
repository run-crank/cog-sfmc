/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';
import * as util from '@run-crank/utilities';
import { baseOperators } from '../../client/constants/operators';
import { isNullOrUndefined } from 'util';

export class DeleteJourney extends BaseStep implements StepInterface {

  protected stepName: string = 'Delete a Salesforce Marketing Cloud journey';
  protected stepExpression: string = 'delete the salesforce marketing cloud journey with id (?<id>[a-zA-Z0-9_-]+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['delete'];
  protected targetObject: string = 'Journey';
  protected expectedFields: Field[] = [
    {
      field: 'id',
      type: FieldDefinition.Type.STRING,
      description: 'ID of the journey to delete',
    },
  ];

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

      // Use the journey's actual ID from the found journey
      const result = await this.client.deleteJourney(existingJourney.id);

      if (result) {
        const record = this.createRecord(existingJourney);
        const orderedRecord = this.createOrderedRecord(existingJourney, stepData['__stepOrder']);
        return this.pass('Successfully deleted journey %s (ID: %s)', [existingJourney.name, existingJourney.id], [record, orderedRecord]);
      } else {
        return this.fail('Failed to delete journey %s', [journeyId]);
      }
    } catch (e) {
      return this.error('There was a problem deleting the journey: %s', [e.toString()]);
    }
  }

  createRecord(journey: Record<string, any>) {
    return this.keyValue('journey', 'Deleted Journey', {
      id: journey.id,
      key: journey.key,
      name: journey.name,
    });
  }

  createOrderedRecord(journey: Record<string, any>, stepOrder = 1) {
    return this.keyValue(`journey.${stepOrder}`, `Deleted Journey from Step ${stepOrder}`, {
      id: journey.id,
      key: journey.key,
      name: journey.name,
    });
  }
}

export { DeleteJourney as Step };
