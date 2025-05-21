/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';

export class DiscoverContact extends BaseStep implements StepInterface {
  protected stepName: string = 'Discover fields on a SFMC contact';
  protected stepExpression: string = 'discover fields on the sfmc contact with key (?<contactKey>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['discover'];
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
      field: 'contactStatus',
      type: FieldDefinition.Type.STRING,
      description: 'The Contact\'s Status',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const contactKey = stepData.contactKey;

    try {
      const contact = await this.client.getContact(contactKey);
      console.log('Contact:', JSON.stringify(contact, null, 2));

      if (!contact) {
        return this.fail('No contact found with key %s', [contactKey]);
      }

      const record = this.createRecord(contact);
      const orderedRecord = this.createOrderedRecord(contact, stepData['__stepOrder']);

      return this.pass('Successfully discovered fields on contact', [], [record, orderedRecord]);
    } catch (e) {
      if (e.toString().indexOf('404') !== -1) {
        return this.fail('No contact found with key %s', [contactKey]);
      }
      return this.error('There was an error checking the contact: %s', [e.toString()]);
    }
  }

  public createRecord(contact): StepRecord {
    // Map contact fields to match expected structure
    const obj = {
      contactKey: contact.contactKey,
      contactId: contact.contactID,
      contactStatus: contact.contactStatus,
      modifiedDate: contact.modifiedDate,
    };

    // Add email if available
    if (contact.email) {
      obj['email'] = contact.email;
    }

    // Add any other properties from the contact
    Object.keys(contact).forEach((key) => {
      if (!obj[key] && key !== 'contactID') {
        obj[key] = contact[key];
      }
    });

    return this.keyValue('exposeOnPass:contact', 'Discovered Contact', obj);
  }

  public createOrderedRecord(contact, stepOrder = 1): StepRecord {
    // Map contact fields to match expected structure
    const obj = {
      contactKey: contact.contactKey,
      contactId: contact.contactID,
      contactStatus: contact.contactStatus,
      modifiedDate: contact.modifiedDate,
    };

    // Add email if available
    if (contact.email) {
      obj['email'] = contact.email;
    }

    // Add any other properties from the contact
    Object.keys(contact).forEach((key) => {
      if (!obj[key] && key !== 'contactID') {
        obj[key] = contact[key];
      }
    });

    return this.keyValue(`contact.${stepOrder}`, `Discovered Contact from Step ${stepOrder}`, obj);
  }
}

export { DiscoverContact as Step };
