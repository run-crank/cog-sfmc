/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';

export class CreateContact extends BaseStep implements StepInterface {
  protected stepName: string = 'Create a SFMC contact';
  protected stepExpression: string = 'create a sfmc contact';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['create'];
  protected targetObject: string = 'Contact';

  protected expectedFields: Field[] = [{
    field: 'contact',
    type: FieldDefinition.Type.MAP,
    description: 'A map of field names to field values',
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
    const contact = stepData.contact;

    // Validate required fields
    if (!contact.email) {
      return this.error('An email address is required to create a contact');
    }

    try {
      console.log('Creating contact with data:', JSON.stringify(contact, null, 2));
      const result = await this.client.createContact(contact);

      console.log('Result:', result);

      if (!result) {
        return this.error('Failed to create contact');
      }

      // Handle partial success case where contact was created but with errors
      if (result.errors) {
        console.log('Contact created with warnings/errors:', result.errors);
      }

      const record = this.createRecord(result);
      const orderedRecord = this.createOrderedRecord(result, stepData['__stepOrder']);

      return this.pass('Successfully created SFMC contact', [], [record, orderedRecord]);
    } catch (e) {
      console.error('Error creating contact:', e);
      if (e instanceof Error) {
        return this.error('There was an error creating the contact: %s', [e.message]);
      }
      return this.error('There was an error creating the contact: %s', [e.toString()]);
    }
  }

  public createRecord(result): StepRecord {
    const obj = {
      contactKey: result.contactKey || '',
      contactId: result.contactId || 0,
      operationStatus: result.operationStatus || '',
    };
    return this.keyValue('contact', 'Created Contact', obj);
  }

  public createOrderedRecord(result, stepOrder = 1): StepRecord {
    const obj = {
      contactKey: result.contactKey || '',
      contactId: result.contactId || 0,
      operationStatus: result.operationStatus || '',
    };
    return this.keyValue(`contact.${stepOrder}`, `Created Contact from Step ${stepOrder}`, obj);
  }
}

export { CreateContact as Step };
