import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';

export class RemoveContactFromList extends BaseStep implements StepInterface {
  protected stepName: string = 'Remove a contact from a SFMC list';
  protected stepExpression: string = 'remove the salesforce marketing cloud contact with key (?<contactKey>.+) from list with id (?<listId>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['remove'];
  protected targetObject: string = 'Contact from List';
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'removedContact',
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
      description: 'The contact key to remove from the list',
    },
    {
      field: 'listId',
      type: FieldDefinition.Type.STRING,
      description: 'The ID of the list to remove the contact from',
    },
  ];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const contactKey = stepData.contactKey;
    const listId = stepData.listId;

    try {
      console.log(`Removing contact ${contactKey} from list ${listId}...`);

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

      const result = await this.client.removeContactFromList(listId, contactKey);

      if (!result) {
        return this.fail('Failed to remove contact %s from list %s', [contactKey, listId]);
      }

      const record = this.createRecord(contactKey, listId, true);
      const orderedRecord = this.createOrderedRecord(contactKey, listId, true, stepData['__stepOrder']);

      return this.pass('Successfully removed contact %s from list %s', [contactKey, list.name], [record, orderedRecord]);
    } catch (e) {
      console.error('Error removing contact from list:', e);
      const record = this.createRecord(contactKey, listId, false);
      const orderedRecord = this.createOrderedRecord(contactKey, listId, false, stepData['__stepOrder']);

      if (e instanceof Error) {
        return this.error('There was an error removing contact from list: %s', [e.message], [record, orderedRecord]);
      }
      return this.error('There was an error removing contact from list: %s', [e.toString()], [record, orderedRecord]);
    }
  }

  public createRecord(contactKey: string, listId: string, success: boolean): StepRecord {
    const obj = {
      contactKey,
      listId,
      success,
    };

    return this.keyValue('removedContact', 'Contact Removed From List', obj);
  }

  public createOrderedRecord(contactKey: string, listId: string, success: boolean, stepOrder = 1): StepRecord {
    const obj = {
      contactKey,
      listId,
      success,
    };

    return this.keyValue(`removedContact.${stepOrder}`, `Contact Removed From List from Step ${stepOrder}`, obj);
  }
}

export { RemoveContactFromList as Step };
