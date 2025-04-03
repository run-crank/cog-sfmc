/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';
import * as util from '@run-crank/utilities';
import { baseOperators } from '../../client/constants/operators';

export class ContactFieldEquals extends BaseStep implements StepInterface {

  protected stepName: string = 'Check a field on a SFMC contact';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'the (?<field>[a-zA-Z0-9_-]+) field on sfmc contact with key (?<contactKey>[a-zA-Z0-9_-]+) should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected actionList: string[] = ['check'];
  protected targetObject: string = 'Contact';
  protected expectedFields: Field[] = [{
    field: 'contactKey',
    type: FieldDefinition.Type.STRING,
    description: "Contact's unique key",
    bulksupport: true,
  }, {
    field: 'field',
    type: FieldDefinition.Type.STRING,
    description: 'Field name to check',
  }, {
    field: 'operator',
    type: FieldDefinition.Type.STRING,
    optionality: FieldDefinition.Optionality.OPTIONAL,
    description: 'Check Logic (be, not be, contain, not contain, be greater than, be less than, be set, not be set, be one of, or not be one of)',
  },
  {
    field: 'expectation',
    type: FieldDefinition.Type.ANYSCALAR,
    description: 'Expected field value',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'contact',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'id',
      type: FieldDefinition.Type.NUMERIC,
      description: 'The Contact\'s ID',
    }, {
      field: 'contactKey',
      type: FieldDefinition.Type.STRING,
      description: 'The Contact\'s Key',
    }, {
      field: 'createdate',
      type: FieldDefinition.Type.DATETIME,
      description: 'The Contact\'s Create Date',
    }, {
      field: 'lastmodifieddate',
      type: FieldDefinition.Type.DATETIME,
      description: 'The Contact\'s Last Modified Date',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const expectation = stepData.expectation;
    const contactKey = stepData.contactKey;
    const field = stepData.field;
    const operator = stepData.operator || 'be';

    try {
      const contact = await this.client.getContactByKey(contactKey);
      console.log('Contact:', JSON.stringify(contact, null, 2));

      // Handle the flat structure of the contact object
      const value = contact[field] || null;

      const records = this.createRecords(contact, stepData['__stepOrder']);
      const result = this.assert(operator, value, expectation, field, stepData['__piiSuppressionLevel']);

      return result.valid ? this.pass(result.message, [], records)
        : this.fail(result.message, [], records);

    } catch (e) {
      if (e instanceof util.UnknownOperatorError) {
        return this.error('%s Please provide one of: %s', [e.message, baseOperators.join(', ')]);
      }
      if (e instanceof util.InvalidOperandError) {
        return this.error('There was an error checking the contact field: %s', [e.message]);
      }

      // Handle API errors and validation errors
      if (e instanceof Error) {
        return this.error('There was an error checking the contact field: %s', [e.message]);
      }
      return this.error('There was an error checking the contact field: %s', [e.toString()]);
    }
  }

  public createRecords(contact, stepOrder = 1): StepRecord[] {
    const obj = {
      id: contact.contactID,
      contactKey: contact.contactKey,
      createdate: contact.modifiedDate,
      lastmodifieddate: contact.modifiedDate,
      ...contact,
    };

    const records = [];
    // Base Record
    records.push(this.keyValue('contact', 'Checked Contact', obj));
    // Ordered Record
    records.push(this.keyValue(`contact.${stepOrder}`, `Checked Contact from Step ${stepOrder}`, obj));
    return records;
  }
}

export { ContactFieldEquals as Step };
