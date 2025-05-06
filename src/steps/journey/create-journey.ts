/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';
import * as util from '@run-crank/utilities';
import { baseOperators } from '../../client/constants/operators';
import { isNullOrUndefined } from 'util';

export class CreateJourney extends BaseStep implements StepInterface {

  protected stepName: string = 'Create a Salesforce Marketing Cloud journey';
  protected stepExpression: string = 'create a salesforce marketing cloud journey';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['create'];
  protected targetObject: string = 'Journey';
  protected expectedFields: Field[] = [
    {
      field: 'name',
      type: FieldDefinition.Type.STRING,
      description: 'Name of the journey',
    },
    {
      field: 'description',
      type: FieldDefinition.Type.STRING,
      description: 'Description of the journey',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
    {
      field: 'key',
      type: FieldDefinition.Type.STRING,
      description: 'Unique key for the journey',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
    {
      field: 'journey',
      type: FieldDefinition.Type.MAP,
      description: 'JSON object representing the journey definition',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
  ];
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'journey',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'id',
      type: FieldDefinition.Type.STRING,
      description: 'ID of the created journey',
    }, {
      field: 'key',
      type: FieldDefinition.Type.STRING,
      description: 'Key of the created journey',
    }],
    dynamicFields: false,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const name: string = stepData.name;

    if (!name) {
      return this.error('The name field is required', []);
    }

    const description: string = stepData.description || '';
    const key: string = stepData.key || '';
    const journeyData = stepData.journey || {};

    try {
      const journey = {
        name,
        description,
        key,
        ...journeyData,
      };

      const result = await this.client.createJourney(journey);

      const record = this.createRecord(result);
      const orderedRecord = this.createOrderedRecord(result, stepData['__stepOrder']);
      return this.pass('Successfully created journey %s with ID %s', [name, result.id], [record, orderedRecord]);
    } catch (e) {
      return this.error('There was a problem creating the journey: %s', [e.toString()]);
    }
  }

  createRecord(journey: Record<string, any>) {
    const record = {
      id: journey.id,
      key: journey.key,
    };
    return this.keyValue('journey', 'Created Journey', record);
  }

  createOrderedRecord(journey: Record<string, any>, stepOrder = 1) {
    const record = {
      id: journey.id,
      key: journey.key,
    };
    return this.keyValue(`journey.${stepOrder}`, `Created Journey from Step ${stepOrder}`, record);
  }
}

export { CreateJourney as Step };
