/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';

export class DeleteContact extends BaseStep implements StepInterface {
  protected stepName: string = 'Delete a SFMC contact';
  protected stepExpression: string = 'delete the sfmc contact with key (?<contactKey>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['delete'];
  protected targetObject: string = 'Contact';

  protected expectedFields: Field[] = [{
    field: 'contactKey',
    type: FieldDefinition.Type.STRING,
    description: 'Contact\'s unique key',
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'contact',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'contactKey',
      type: FieldDefinition.Type.STRING,
      description: 'The Contact\'s Key',
    }, {
      field: 'contactId',
      type: FieldDefinition.Type.NUMERIC,
      description: 'The Contact\'s ID',
    }, {
      field: 'operationStatus',
      type: FieldDefinition.Type.STRING,
      description: 'The operation status',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const contactKey = stepData.contactKey;

    try {
      const result = await this.client.deleteContact(contactKey);

      if (!result) {
        return this.error('Failed to delete contact');
      }

      const record = this.createRecord(result);
      const orderedRecord = this.createOrderedRecord(result, stepData['__stepOrder']);

      return this.pass('Successfully deleted SFMC contact with key %s', [contactKey], [record, orderedRecord]);
    } catch (e) {
      if (e instanceof Error) {
        return this.error('There was an error deleting the contact: %s', [e.message]);
      }
      return this.error('There was an error deleting the contact: %s', [e.toString()]);
    }
  }

  public createRecord(result): StepRecord {
    const obj = {
      contactKey: result.contactKey,
      contactId: result.contactID || result.contactId,
      operationStatus: result.operationStatus,
    };

    // Add any additional fields from the result
    Object.keys(result).forEach((key) => {
      if (!obj[key] && key !== 'contactID') {
        obj[key] = result[key];
      }
    });

    return this.keyValue('contact', 'Deleted Contact', obj);
  }

  public createOrderedRecord(result, stepOrder = 1): StepRecord {
    const obj = {
      contactKey: result.contactKey,
      contactId: result.contactID || result.contactId,
      operationStatus: result.operationStatus,
    };

    // Add any additional fields from the result
    Object.keys(result).forEach((key) => {
      if (!obj[key] && key !== 'contactID') {
        obj[key] = result[key];
      }
    });

    return this.keyValue(`contact.${stepOrder}`, `Deleted Contact from Step ${stepOrder}`, obj);
  }
}

export { DeleteContact as Step };
