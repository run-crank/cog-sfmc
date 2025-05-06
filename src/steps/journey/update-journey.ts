/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';
import * as util from '@run-crank/utilities';
import { baseOperators } from '../../client/constants/operators';
import { isNullOrUndefined } from 'util';

export class UpdateJourney extends BaseStep implements StepInterface {

  protected stepName: string = 'Update a Salesforce Marketing Cloud journey';
  protected stepExpression: string = 'update the salesforce marketing cloud journey with id (?<id>[a-zA-Z0-9_-]+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['update'];
  protected targetObject: string = 'Journey';
  protected expectedFields: Field[] = [
    {
      field: 'id',
      type: FieldDefinition.Type.STRING,
      description: 'ID of the journey to update',
    },
    {
      field: 'name',
      type: FieldDefinition.Type.STRING,
      description: 'New name of the journey',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
    {
      field: 'description',
      type: FieldDefinition.Type.STRING,
      description: 'New description of the journey',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
    {
      field: 'journey',
      type: FieldDefinition.Type.MAP,
      description: 'JSON object representing the journey update definition',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
  ];
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'journey',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'id',
      type: FieldDefinition.Type.STRING,
      description: 'ID of the updated journey',
    }],
    dynamicFields: false,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const journeyId: string = stepData.id;

    try {
      // First, get the existing journey to merge with updates
      let existingJourney = await this.client.getJourneyById(journeyId);

      // If not found by ID, try by key
      if (!existingJourney) {
        existingJourney = await this.client.getJourneyByKey(journeyId);
      }

      if (!existingJourney) {
        return this.fail('Journey %s not found', [journeyId]);
      }

      // Create update object merging existing journey with updates
      const updateData = {
        ...existingJourney,
      };

      // Update fields from stepData if provided
      if (stepData.name) updateData.name = stepData.name;
      if (stepData.description) updateData.description = stepData.description;
      if (stepData.journey) {
        Object.keys(stepData.journey).forEach((key) => {
          updateData[key] = stepData.journey[key];
        });
      }

      // Update the journey
      const result = await this.client.updateJourney(existingJourney.id, updateData);

      // If we got a result, the update was successful
      if (result) {
        const record = this.createRecord(result);
        const orderedRecord = this.createOrderedRecord(result, stepData['__stepOrder']);
        return this.pass('Successfully updated journey %s (ID: %s)', [result.name, result.id], [record, orderedRecord]);
      } else {
        return this.fail('Failed to update journey %s', [journeyId]);
      }
    } catch (e) {
      // Extract just the message without the Error: prefix
      const errorMessage = e.message || e.toString().replace(/^Error: /, '');
      return this.error('There was a problem updating the journey: %s', [errorMessage]);
    }
  }

  createRecord(journey: Record<string, any>) {
    return this.keyValue('journey', 'Updated Journey', journey);
  }

  createOrderedRecord(journey: Record<string, any>, stepOrder = 1) {
    return this.keyValue(`journey.${stepOrder}`, `Updated Journey from Step ${stepOrder}`, journey);
  }
}

export { UpdateJourney as Step };
