import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';

export class UpdateList extends BaseStep implements StepInterface {
  protected stepName: string = 'Update a SFMC list';
  protected stepExpression: string = 'update the salesforce marketing cloud list with id (?<listId>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['update'];
  protected targetObject: string = 'List';
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'list',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'id',
      type: FieldDefinition.Type.STRING,
      description: 'The ID of the updated list',
    }, {
      field: 'name',
      type: FieldDefinition.Type.STRING,
      description: 'The name of the updated list',
    }, {
      field: 'status',
      type: FieldDefinition.Type.STRING,
      description: 'The status of the updated list (e.g. Active, Deleted)',
    }],
    dynamicFields: true,
  }];

  protected expectedFields: Field[] = [
    {
      field: 'listId',
      type: FieldDefinition.Type.STRING,
      description: 'The ID of the list to update',
    },
    {
      field: 'list',
      type: FieldDefinition.Type.MAP,
      description: 'A map of field names to field values',
    },
  ];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const listId = stepData.listId;
    const list = stepData.list;

    try {
      console.log(`Updating list with ID ${listId}...`);

      // First, check if the list exists
      const existingList = await this.client.getListById(listId);
      if (!existingList) {
        return this.fail('No list found with ID %s', [listId]);
      }

      console.log('Updating list with data:', JSON.stringify(list, null, 2));
      const result = await this.client.updateList(listId, list);

      if (!result) {
        return this.fail('Failed to update list with ID %s', [listId]);
      }

      // If the update was successful but there are warnings
      if (result.warnings && result.warnings.length > 0) {
        console.log('List updated with warnings:', result.warnings);
      }

      const record = this.createRecord(result);
      const orderedRecord = this.createOrderedRecord(result, stepData['__stepOrder']);

      return this.pass('Successfully updated SFMC list %s', [result.name], [record, orderedRecord]);
    } catch (e) {
      console.error('Error updating list:', e);
      if (e instanceof Error) {
        return this.error('There was an error updating the list: %s', [e.message]);
      }
      return this.error('There was an error updating the list: %s', [e.toString()]);
    }
  }

  public createRecord(list): StepRecord {
    const obj = {
      id: list.id || '',
      name: list.name || '',
      status: list.status || 'Active',
    };

    // Add any additional fields
    Object.keys(list).forEach((key) => {
      if (!obj[key]) {
        obj[key] = list[key];
      }
    });

    return this.keyValue('list', 'Updated List', obj);
  }

  public createOrderedRecord(list, stepOrder = 1): StepRecord {
    const obj = {
      id: list.id || '',
      name: list.name || '',
      status: list.status || 'Active',
    };

    // Add any additional fields
    Object.keys(list).forEach((key) => {
      if (!obj[key]) {
        obj[key] = list[key];
      }
    });

    return this.keyValue(`list.${stepOrder}`, `Updated List from Step ${stepOrder}`, obj);
  }
}

export { UpdateList as Step };
