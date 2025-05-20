import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';

export class DeleteList extends BaseStep implements StepInterface {
  protected stepName: string = 'Delete a SFMC list';
  protected stepExpression: string = 'delete the salesforce marketing cloud list with id (?<listId>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['delete'];
  protected targetObject: string = 'List';
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'list',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'id',
      type: FieldDefinition.Type.STRING,
      description: 'The ID of the deleted list',
    }, {
      field: 'name',
      type: FieldDefinition.Type.STRING,
      description: 'The name of the deleted list',
    }],
    dynamicFields: true,
  }];

  protected expectedFields: Field[] = [
    {
      field: 'listId',
      type: FieldDefinition.Type.STRING,
      description: 'The ID of the list to delete',
    },
  ];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const listId = stepData.listId;

    try {
      console.log(`Deleting list with ID ${listId}...`);

      // First, check if the list exists and store its data for creating records later
      const existingList = await this.client.getListById(listId);
      if (!existingList) {
        return this.fail('No list found with ID %s', [listId]);
      }

      const result = await this.client.deleteList(listId);

      if (!result) {
        return this.fail('Failed to delete list with ID %s', [listId]);
      }

      const record = this.createRecord(existingList);
      const orderedRecord = this.createOrderedRecord(existingList, stepData['__stepOrder']);

      return this.pass('Successfully deleted SFMC list %s', [existingList.name], [record, orderedRecord]);
    } catch (e) {
      console.error('Error deleting list:', e);
      if (e instanceof Error) {
        return this.error('There was an error deleting the list: %s', [e.message]);
      }
      return this.error('There was an error deleting the list: %s', [e.toString()]);
    }

  }

  public createRecord(list): StepRecord {
    const obj = {
      id: list.id || '',
      name: list.name || '',
    };

    return this.keyValue('list', 'Deleted List', obj);
  }

  public createOrderedRecord(list, stepOrder = 1): StepRecord {
    const obj = {
      id: list.id || '',
      name: list.name || '',
    };

    return this.keyValue(`list.${stepOrder}`, `Deleted List from Step ${stepOrder}`, obj);
  }
}
export { DeleteList as Step };
