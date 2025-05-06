/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';
import * as util from '@run-crank/utilities';
import { baseOperators } from '../../client/constants/operators';
import { isNullOrUndefined } from 'util';

export class DiscoverJourney extends BaseStep implements StepInterface {

  protected stepName: string = 'Discover a Salesforce Marketing Cloud journey';
  protected stepExpression: string = 'discover a salesforce marketing cloud journey with id (?<idOrKey>[a-zA-Z0-9_-]+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['discover'];
  protected targetObject: string = 'Journey';
  protected expectedFields: Field[] = [
    {
      field: 'idOrKey',
      type: FieldDefinition.Type.STRING,
      description: 'ID or Key of the journey to discover',
    },
    {
      field: 'extras',
      type: FieldDefinition.Type.STRING,
      description: 'Extra information to include (activities, outcome, stats, all)',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
  ];
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'journey',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'id',
      type: FieldDefinition.Type.STRING,
      description: 'ID of the discovered journey',
    }, {
      field: 'name',
      type: FieldDefinition.Type.STRING,
      description: 'Name of the discovered journey',
    }, {
      field: 'description',
      type: FieldDefinition.Type.STRING,
      description: 'Description of the discovered journey',
    }, {
      field: 'status',
      type: FieldDefinition.Type.STRING,
      description: 'Status of the discovered journey',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const idOrKey: string = stepData.idOrKey;
    const extras: string = stepData.extras || '';

    try {
      // First try by ID
      let journey = await this.client.getJourneyById(idOrKey, extras);

      // If not found by ID, try by key
      if (!journey) {
        journey = await this.client.getJourneyByKey(idOrKey, extras);
      }

      if (!journey) {
        return this.fail('Journey with ID or Key %s not found', [idOrKey]);
      }

      const record = this.createRecord(journey);
      const orderedRecord = this.createOrderedRecord(journey, stepData['__stepOrder']);

      return this.pass('Successfully discovered journey %s (ID: %s)', [journey.name, journey.id], [record, orderedRecord]);
    } catch (e) {
      return this.error('There was a problem discovering the journey: %s', [e.toString()]);
    }
  }

  createRecord(journey: Record<string, any>) {
    return this.keyValue('journey', 'Discovered Journey', journey);
  }

  createOrderedRecord(journey: Record<string, any>, stepOrder = 1) {
    return this.keyValue(`journey.${stepOrder}`, `Discovered Journey from Step ${stepOrder}`, journey);
  }
}

export { DiscoverJourney as Step };
