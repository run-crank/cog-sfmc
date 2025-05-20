import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';

export class AddContactToList extends BaseStep implements StepInterface {
  protected stepName: string = 'Add a contact to a SFMC list';
  protected stepExpression: string = 'add the salesforce marketing cloud contact with key (?<contactKey>.+) to list with id (?<listId>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['add'];
  protected targetObject: string = 'Contact to List';
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'addedContact',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'contactKey',
      type: FieldDefinition.Type.STRING,
      description: 'The contact key',
    }, {
      field: 'listId',
      type: FieldDefinition.Type.STRING,
      description: 'The ID of the list',
    }, {
      field: 'success',
      type: FieldDefinition.Type.BOOLEAN,
      description: 'Whether the operation was successful',
    }],
    dynamicFields: true,
  }];

  protected expectedFields: Field[] = [
    {
      field: 'contactKey',
      type: FieldDefinition.Type.STRING,
      description: 'The contact key to add to the list',
    },
    {
      field: 'listId',
      type: FieldDefinition.Type.STRING,
      description: 'The ID of the list to add the contact to',
    },
  ];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const contactKey = stepData.contactKey;
    const listId = stepData.listId;

    try {
      console.log(`Adding contact ${contactKey} to list ${listId}...`);

      // First, check if the list exists
      const list = await this.client.getListById(listId);
      if (!list) {
        return this.fail('No list found with ID %s', [listId]);
      }

      // Check if the contact exists
      const contact = await this.client.getContactByKey(contactKey);
      if (!contact) {
        return this.fail('No contact found with key %s', [contactKey]);
      }

      const result = await this.client.addContactToList(listId, contactKey);

      if (!result) {
        return this.fail('Failed to add contact %s to list %s', [contactKey, listId]);
      }

      const record = this.createRecord(contactKey, listId, true);
      const orderedRecord = this.createOrderedRecord(contactKey, listId, true, stepData['__stepOrder']);

      return this.pass('Successfully added contact %s to list %s', [contactKey, list.name], [record, orderedRecord]);
    } catch (e) {
      console.error('Error adding contact to list:', e);
      const record = this.createRecord(contactKey, listId, false);
      const orderedRecord = this.createOrderedRecord(contactKey, listId, false, stepData['__stepOrder']);

      if (e instanceof Error) {
        return this.error('There was an error adding contact to list: %s', [e.message], [record, orderedRecord]);
      }
      return this.error('There was an error adding contact to list: %s', [e.toString()], [record, orderedRecord]);
    }
  }

  public createRecord(contactKey: string, listId: string, success: boolean): StepRecord {
    const obj = {
      contactKey,
      listId,
      success,
    };

    return this.keyValue('addedContact', 'Contact Added To List', obj);
  }

  public createOrderedRecord(contactKey: string, listId: string, success: boolean, stepOrder = 1): StepRecord {
    const obj = {
      contactKey,
      listId,
      success,
    };

    return this.keyValue(`addedContact.${stepOrder}`, `Contact Added To List from Step ${stepOrder}`, obj);
  }
}

export { AddContactToList as Step };
