/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';
import * as util from '@run-crank/utilities';
import { baseOperators } from '../../client/constants/operators';
import { isNullOrUndefined } from 'util';

export class AddContactToJourney extends BaseStep implements StepInterface {

  protected stepName: string = 'Add a contact to a Salesforce Marketing Cloud journey';
  protected stepExpression: string = 'add the contact with key (?<contactKey>[a-zA-Z0-9_@.-]+) to salesforce marketing cloud journey (?<journeyKey>[a-zA-Z0-9_-]+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['add'];
  protected targetObject: string = 'Contact to Journey';
  protected expectedFields: Field[] = [
    {
      field: 'contactKey',
      type: FieldDefinition.Type.STRING,
      description: 'Contact Key (or Email if using Email as Subscriber Key)',
    },
    {
      field: 'journeyKey',
      type: FieldDefinition.Type.STRING,
      description: 'Event Definition Key of the journey entry source',
    },
    {
      field: 'data',
      type: FieldDefinition.Type.MAP,
      description: 'Additional data to include with the contact for journey entry',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
  ];
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'journeyEntry',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'success',
      type: FieldDefinition.Type.BOOLEAN,
      description: 'Whether the contact was successfully added to the journey',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const contactKey: string = stepData.contactKey;
    const journeyKey: string = stepData.journeyKey;
    const data: Record<string, any> = stepData.data || {};

    try {
      const result = await this.client.addContactToJourney(journeyKey, contactKey, data);

      const record = this.createRecord(result);
      const orderedRecord = this.createOrderedRecord(result, stepData['__stepOrder']);
      return this.pass('Successfully added contact %s to journey %s', [contactKey, journeyKey], [record, orderedRecord]);
    } catch (e) {
      return this.error('There was a problem adding the contact to the journey: %s', [e.toString()]);
    }
  }

  createRecord(result: Record<string, any>) {
    return this.keyValue('journeyEntry', 'Journey Entry Result', result);
  }

  createOrderedRecord(result: Record<string, any>, stepOrder = 1) {
    return this.keyValue(`journeyEntry.${stepOrder}`, `Journey Entry Result from Step ${stepOrder}`, result);
  }
}

export { AddContactToJourney as Step };
