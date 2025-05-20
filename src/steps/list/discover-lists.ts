import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';

export class DiscoverLists extends BaseStep implements StepInterface {
  protected stepName: string = 'Discover Salesforce Marketing Cloud lists';
  protected stepExpression: string = 'discover salesforce marketing cloud lists';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['discover'];
  protected targetObject: string = 'Lists';
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'lists',
    type: RecordDefinition.Type.TABLE,
    fields: [{
      field: 'id',
      type: FieldDefinition.Type.STRING,
      description: 'The ID of the list',
    }, {
      field: 'name',
      type: FieldDefinition.Type.STRING,
      description: 'The name of the list',
    }, {
      field: 'description',
      type: FieldDefinition.Type.STRING,
      description: 'The description of the list',
    }, {
      field: 'status',
      type: FieldDefinition.Type.STRING,
      description: 'The status of the list',
    }],
    dynamicFields: true,
  }];

  protected expectedFields: Field[] = [
    {
      field: 'filters',
      type: FieldDefinition.Type.MAP,
      description: 'Filters to apply to the list retrieval (optional)',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
  ];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const filters = stepData.filters || {};

    try {
      console.log('Discovering lists...');

      const lists = await this.client.getAllLists(filters);

      if (!lists || lists.length === 0) {
        return this.fail('No lists found in the account');
      }

      console.log(`Found ${lists.length} lists`);

      const record = this.createRecord(lists);
      return this.pass('Successfully discovered %d SFMC lists', [lists.length], [record]);
    } catch (e) {
      console.error('Error discovering lists:', e);
      if (e instanceof Error) {
        return this.error('There was an error discovering lists: %s', [e.message]);
      }
      return this.error('There was an error discovering lists: %s', [e.toString()]);
    }
  }

  public createRecord(lists: Record<string, any>[]): StepRecord {
    const headers = {
      id: 'ID',
      name: 'Name',
      description: 'Description',
      status: 'Status',
      createdDate: 'Created Date',
      modifiedDate: 'Modified Date',
    };

    const rows = lists.map((list) => {
      return {
        id: list.id || '',
        name: list.name || '',
        description: list.description || '',
        status: list.status || 'Unknown',
        createdDate: list.createdDate || '',
        modifiedDate: list.modifiedDate || '',
      };
    });

    return this.table('lists', 'Discovered Lists', headers, rows);
  }
}

export { DiscoverLists as Step };
