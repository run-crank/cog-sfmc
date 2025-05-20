import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';

export class DiscoverListMembers extends BaseStep implements StepInterface {
  protected stepName: string = 'Discover Salesforce Marketing Cloud list members';
  protected stepExpression: string = 'discover members of salesforce marketing cloud list with id (?<listId>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['discover'];
  protected targetObject: string = 'List Members';
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'listMembers',
    type: RecordDefinition.Type.TABLE,
    fields: [{
      field: 'contactKey',
      type: FieldDefinition.Type.STRING,
      description: 'The contact key of the list member',
    }, {
      field: 'status',
      type: FieldDefinition.Type.STRING,
      description: 'The status of the list member',
    }, {
      field: 'createdDate',
      type: FieldDefinition.Type.DATETIME,
      description: 'When the contact was added to the list',
    }, {
      field: 'modifiedDate',
      type: FieldDefinition.Type.DATETIME,
      description: 'When the contact was last modified in the list',
    }],
    dynamicFields: true,
  }];

  protected expectedFields: Field[] = [
    {
      field: 'listId',
      type: FieldDefinition.Type.STRING,
      description: 'The ID of the list to get members from',
    },
    {
      field: 'page',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Page number for paginated results (optional)',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
    {
      field: 'pageSize',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Number of members per page (optional, default 50)',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
    {
      field: 'filters',
      type: FieldDefinition.Type.MAP,
      description: 'Additional filters to apply to the member search (optional)',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
  ];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const listId = stepData.listId;
    const options = {
      page: stepData.page || 1,
      pageSize: stepData.pageSize || 50,
      filters: stepData.filters || {},
    };

    try {
      console.log(`Discovering members for list with ID ${listId}...`);

      // First, check if the list exists
      const list = await this.client.getListById(listId);
      if (!list) {
        return this.fail('No list found with ID %s', [listId]);
      }

      const members = await this.client.getListMembers(listId, options);

      if (!members || members.length === 0) {
        return this.pass('No members found in list %s (%s)', [list.name, listId], []);
      }

      console.log(`Found ${members.length} members in list ${list.name}`);

      const record = this.createRecord(members, list);
      return this.pass('Successfully discovered %d members in SFMC list %s', [members.length, list.name], [record]);
    } catch (e) {
      console.error('Error discovering list members:', e);
      if (e instanceof Error) {
        return this.error('There was an error discovering list members: %s', [e.message]);
      }
      return this.error('There was an error discovering list members: %s', [e.toString()]);
    }
  }

  public createRecord(members: Record<string, any>[], list: Record<string, any>): StepRecord {
    const headers = {
      contactKey: 'Contact Key',
      status: 'Status',
      createdDate: 'Added Date',
      modifiedDate: 'Modified Date',
    };

    const rows = members.map((member) => {
      return {
        contactKey: member.contactKey || '',
        status: member.status || 'Active',
        createdDate: member.createdDate || '',
        modifiedDate: member.modifiedDate || '',
      };
    });

    return this.table('listMembers', `Members of List "${list.name}"`, headers, rows);
  }
}

export { DiscoverListMembers as Step };
