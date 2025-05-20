import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';

export class CreateList extends BaseStep implements StepInterface {
  protected stepName: string = 'Create a SFMC list';
  protected stepExpression: string = 'create a salesforce marketing cloud list';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['create'];
  protected targetObject: string = 'List';
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'list',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'id',
      type: FieldDefinition.Type.STRING,
      description: 'The ID of the created list',
    }, {
      field: 'name',
      type: FieldDefinition.Type.STRING,
      description: 'The name of the created list',
    }, {
      field: 'status',
      type: FieldDefinition.Type.STRING,
      description: 'The status of the created list (e.g. Active, Deleted)',
    }],
    dynamicFields: true,
  }];

  protected expectedFields: Field[] = [
    {
      field: 'list',
      type: FieldDefinition.Type.MAP,
      description: 'A map of field names to field values',
    },
  ];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const list = stepData.list;

    // Validate required fields
    if (!list.name) {
      return this.error('The name field is required to create a list');
    }

    try {
      console.log('Creating list with data:', JSON.stringify(list, null, 2));
      const result = await this.client.createList(list);

      console.log('Result:', result);

      if (!result) {
        return this.error('Failed to create list');
      }

      // Check if the result is an error object
      if (result.errorcode) {
        return this.error('API returned error: %s - %s', [result.errorcode, result.message || 'Unknown error']);
      }

      // If the creation was successful but there are warnings
      if (result.warnings && result.warnings.length > 0) {
        console.log('List created with warnings:', result.warnings);
      }

      // Ensure required fields exist
      if (!result.id || !result.name) {
        return this.error('Invalid response from API: missing required fields');
      }

      const record = this.createRecord(result);
      const orderedRecord = this.createOrderedRecord(result, stepData['__stepOrder']);

      return this.pass('Successfully created SFMC list %s', [result.name], [record, orderedRecord]);
    } catch (e) {
      console.error('Error creating list:', e);
      let errorMessage = 'Unknown error';

      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      } else if (e && typeof e === 'object') {
        try {
          errorMessage = JSON.stringify(e);
        } catch (jsonError) {
          errorMessage = `Non-serializable error: ${Object.prototype.toString.call(e)}`;
        }
      }

      return this.error('There was an error creating the list: %s', [errorMessage]);
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

    return this.keyValue('list', 'Created List', obj);
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

    return this.keyValue(`list.${stepOrder}`, `Created List from Step ${stepOrder}`, obj);
  }
}

export { CreateList as Step };
