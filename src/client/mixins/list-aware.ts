export class ListAwareMixin {
  client: any;
  soapClient: any;

  /**
   * Utility method to make a SOAP request using the soapClient from the parent
   */
  public async makeSoapRequest(action: string, props: any = {}): Promise<any> {
    // Try to use the appropriate SOAP client - either from this.soapClient or from this.client.soapClient
    const soapClient = this.soapClient || this.client.soapClient;

    if (!soapClient) {
      console.error('SOAP client not found! soapClient:', !!this.soapClient, 'client.soapClient:', !!this.client.soapClient);
      throw new Error('SOAP client not initialized');
    }

    console.log(`Calling SOAP API (${action}) with props:`, JSON.stringify(props, null, 2));

    // Based on the action, call the appropriate method on the SOAP client
    return new Promise((resolve, reject) => {
      try {
        let type = '';
        let data = {};

        // Extract the type and data based on the action and props structure
        if (action === 'Create') {
          type = props.CreateRequest?.Objects?.$?.['xsi:type'] || 'List';
          data = props.CreateRequest?.Objects || {};
        } else if (action === 'Retrieve') {
          type = props.RetrieveRequestMsg?.RetrieveRequest?.ObjectType || 'List';
          data = props.RetrieveRequestMsg?.RetrieveRequest?.Filter || {};
        } else if (action === 'Update') {
          type = props.UpdateRequest?.Objects?.$?.['xsi:type'] || 'List';
          data = props.UpdateRequest?.Objects || {};
        } else if (action === 'Delete') {
          type = props.DeleteRequest?.Objects?.$?.['xsi:type'] || 'List';
          data = props.DeleteRequest?.Objects || {};
        }

        console.log(`Using soapClient.${action.toLowerCase()} with type ${type}`);

        // Call the corresponding method on the SOAP client
        if (typeof soapClient[action.toLowerCase()] === 'function') {
          soapClient[action.toLowerCase()](type, data, (err: any, response: any) => {
            if (err) {
              console.error(`SOAP Error (${action}):`, err);
              return reject(err);
            }

            console.log(`SOAP Response (${action}):`, JSON.stringify(response?.body, null, 2));

            if (response?.body?.Results) {
              return resolve(response.body.Results);
            } else if (response?.body) {
              return resolve(response.body);
            } else {
              return resolve(response);
            }
          });
        } else {
          console.error(`SOAP client missing method: ${action.toLowerCase()}`);
          reject(new Error(`SOAP client method not available: ${action.toLowerCase()}`));
        }
      } catch (error) {
        console.error('Error in makeSoapRequest:', error);
        reject(error);
      }
    });
  }

  /**
   * Gets a single list by ID from SFMC.
   */
  public async getListById(listId: string): Promise<Record<string, any>> {
    try {
      console.log(`Fetching list with ID ${listId}...`);

      // Get the SOAP client
      const soapClient = this.soapClient || this.client.soapClient;

      if (!soapClient || typeof soapClient.retrieve !== 'function') {
        console.error('SOAP client not properly initialized or missing retrieve method');
        return null;
      }

      // Define the properties to retrieve
      const props = ['ID', 'ListName', 'Description', 'Type', 'CustomerKey', 'ObjectID', 'ModifiedDate', 'CreatedDate'];

      // Set up filter to find list by ID
      const options = {
        filter: {
          leftOperand: 'ID',
          operator: 'equals',
          rightOperand: parseInt(listId, 10),
        },
      };

      console.log('Attempting to retrieve list via SOAP API...');

      return new Promise((resolve) => {
        soapClient.retrieve('List', props, options, (err: any, response: any) => {
          if (err) {
            console.error('SOAP error retrieving list:', err);
            resolve(null);
            return;
          }

          console.log('SOAP list retrieval response:', response?.body);

          if (response?.body?.Results && Array.isArray(response.body.Results) && response.body.Results.length > 0) {
            const list = response.body.Results[0];
            console.log(`List found with ID ${listId}`);

            return resolve({
              id: list.ID || listId,
              customerKey: list.CustomerKey || '',
              name: list.ListName || '',
              description: list.Description || '',
              type: list.Type || '',
              status: 'Active', // Status is inferred
              createdDate: list.CreatedDate || '',
              modifiedDate: list.ModifiedDate || '',
            });
          } else {
            console.log(`No list found with ID ${listId}`);
            resolve(null);
          }
        });
      });
    } catch (e) {
      console.error('Error in getListById:', e);
      if (e.response && e.response.statusCode === 404) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Gets a single list by name from SFMC.
   */
  public async getListByName(listName: string): Promise<Record<string, any>> {
    try {
      console.log(`Fetching list with name ${listName}...`);

      const response = await this.client.get({
        uri: 'asset/v1/content/lists',
        qs: {
          $filter: `name eq '${listName}'`,
        },
      });

      console.log(`List API response (getByName): ${response.statusCode}`);

      if (response.statusCode >= 400) {
        console.error(`Error fetching list by name: ${response.statusCode}`, response.body);
        return null;
      }

      if (response.body.items && response.body.items.length) {
        console.log(`List found with name ${listName}`);
        return response.body.items[0];
      }

      console.log(`No list found with name ${listName}`);
      return null;
    } catch (e) {
      console.error('Error in getListByName:', e);
      if (e.response && e.response.statusCode === 404) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Creates a new list in SFMC.
   */
  public async createList(listDefinition: Record<string, any>): Promise<Record<string, any>> {
    try {
      console.log(`Creating list with name ${listDefinition.name}...`);

      // Ensure the required fields are present
      if (!listDefinition.name) {
        throw new Error('List name is required');
      }

      // Get the SOAP client
      const soapClient = this.soapClient || this.client.soapClient;

      if (!soapClient || typeof soapClient.create !== 'function') {
        console.error('SOAP client not properly initialized or missing create method');
        return {
          errorcode: 500,
          message: 'SOAP client not properly initialized',
        };
      }

      // List creation is supported through SOAP API
      const listProps = {
        CustomerKey: listDefinition.customerKey || `LIST_${Date.now()}`,
        ListName: listDefinition.name,
        Description: listDefinition.description || '',
        Type: listDefinition.type || 'Private',
        ListClassification: listDefinition.classification || 'ExactTargetList',
      };

      console.log('Attempting to create list via SOAP API...');
      console.log('List properties:', JSON.stringify(listProps, null, 2));

      return new Promise((resolve) => {
        soapClient.create('List', listProps, (err: any, response: any) => {
          if (err) {
            console.error('SOAP error creating list:', err);
            resolve({
              errorcode: err.statusCode || 500,
              message: err.message || 'Error creating list via SOAP API',
              error: err,
            });
            return;
          }

          console.log('SOAP list creation response:', response);

          if (response && response.body && response.body.Results) {
            const result = response.body.Results[0] || {};

            if (result.StatusCode === 'OK' || result.StatusCode === 'Created') {
              // If the list was created successfully, get its details
              resolve({
                id: result.NewID || '',
                customerKey: listProps.CustomerKey,
                name: listDefinition.name,
                description: listDefinition.description || '',
                status: 'Active',
                type: listDefinition.type || 'Private',
                classification: listDefinition.classification || 'ExactTargetList',
                createdDate: new Date().toISOString(),
              });
            } else {
              console.error('SOAP list creation failed:', result.StatusMessage);
              resolve({
                errorcode: result.ErrorCode || 500,
                message: result.StatusMessage || 'List creation failed',
                details: result,
              });
            }
          } else {
            console.error('Unexpected SOAP response format:', response);
            resolve({
              errorcode: 500,
              message: 'Unexpected SOAP response format',
              details: response,
            });
          }
        });
      });
    } catch (e) {
      console.error('Error creating list:', e);
      return {
        errorcode: e.statusCode || 500,
        message: e.message || 'Unknown error creating list',
        error: e,
      };
    }
  }

  /**
   * Updates an existing list in SFMC.
   */
  public async updateList(listId: string, listDefinition: Record<string, any>): Promise<Record<string, any>> {
    try {
      console.log(`Updating list with ID ${listId}...`);

      // First, get the existing list to ensure it exists
      const existingList = await this.getListById(listId);
      if (!existingList) {
        throw new Error(`List with ID ${listId} not found`);
      }

      const payload: Record<string, any> = {
        ...existingList,
        ...listDefinition,
        id: listId, // Ensure ID remains the same
      };

      // Remove unnecessary fields
      delete payload.createdDate;
      delete payload.modifiedDate;

      const response = await this.client.patch({
        uri: `asset/v1/content/lists/${listId}`,
        body: JSON.stringify(payload),
      });

      console.log(`List update response: ${response.statusCode}`);

      if (response.statusCode >= 400) {
        console.error(`Error updating list: ${response.statusCode}`, response.body);
        throw new Error(`Failed to update list: ${JSON.stringify(response.body)}`);
      }

      // Get the updated list after the update
      return await this.getListById(listId);
    } catch (e) {
      console.error('Error updating list:', e);
      throw e;
    }
  }

  /**
   * Deletes a list in SFMC.
   */
  public async deleteList(listId: string): Promise<boolean> {
    try {
      console.log(`Deleting list with ID ${listId}...`);

      // First, check if the list exists
      const existingList = await this.getListById(listId);
      if (!existingList) {
        console.log(`List with ID ${listId} not found, nothing to delete`);
        return false;
      }

      // Get the SOAP client
      const soapClient = this.soapClient || this.client.soapClient;

      if (!soapClient || typeof soapClient.delete !== 'function') {
        console.error('SOAP client not properly initialized or missing delete method');
        throw new Error('SOAP client not properly initialized');
      }

      // Using SOAP API to delete the list
      const listProps = {
        ID: parseInt(listId, 10),
      };

      console.log('Attempting to delete list via SOAP API...');

      return new Promise((resolve, reject) => {
        soapClient.delete('List', listProps, (err: any, response: any) => {
          if (err) {
            console.error('SOAP error deleting list:', err);
            reject(err);
            return;
          }

          console.log('SOAP list deletion response:', response);

          if (response && response.body && response.body.Results) {
            const result = response.body.Results[0] || {};

            if (result.StatusCode === 'OK' || result.StatusCode === 'Deleted') {
              resolve(true);
            } else {
              console.error('SOAP list deletion failed:', result.StatusMessage);
              reject(new Error(`Failed to delete list: ${result.StatusMessage}`));
            }
          } else {
            console.error('Unexpected SOAP response format:', response);
            reject(new Error('Unexpected SOAP response format'));
          }
        });
      });
    } catch (e) {
      console.error('Error deleting list:', e);
      throw e;
    }
  }

  /**
   * Gets all lists from SFMC.
   */
  public async getAllLists(filters: Record<string, any> = {}): Promise<Record<string, any>[]> {
    try {
      console.log('Fetching all lists...');

      // Get the SOAP client
      const soapClient = this.soapClient || this.client.soapClient;

      if (!soapClient || typeof soapClient.retrieve !== 'function') {
        console.error('SOAP client not properly initialized or missing retrieve method');
        return [];
      }

      // Define the properties to retrieve
      const props = ['ID', 'ListName', 'Description', 'Type', 'CustomerKey', 'ObjectID', 'ModifiedDate', 'CreatedDate'];

      // Set up filter if provided
      const options: any = {};
      if (filters && Object.keys(filters).length > 0) {
        options.filter = {
          leftOperand: Object.keys(filters)[0],
          operator: 'equals',
          rightOperand: filters[Object.keys(filters)[0]],
        };
      }

      console.log('Attempting to retrieve lists via SOAP API...');

      return new Promise((resolve) => {
        soapClient.retrieve('List', props, options, (err: any, response: any) => {
          if (err) {
            console.error('SOAP error retrieving lists:', err);
            resolve([]);
            return;
          }

          console.log('SOAP lists retrieval response:', response?.body);

          if (response?.body?.Results && Array.isArray(response.body.Results)) {
            const lists = response.body.Results.map((list: any) => ({
              id: list.ID || '',
              customerKey: list.CustomerKey || '',
              name: list.ListName || '',
              description: list.Description || '',
              type: list.Type || '',
              status: 'Active', // Status is inferred
              createdDate: list.CreatedDate || '',
              modifiedDate: list.ModifiedDate || '',
            }));

            console.log(`Found ${lists.length} lists`);
            resolve(lists);
          } else {
            console.log('No lists found or unexpected response format');
            resolve([]);
          }
        });
      });
    } catch (e) {
      console.error('Error in getAllLists:', e);
      return [];
    }
  }

  /**
   * Gets all subscribers in a list from SFMC.
   */
  public async getListMembers(listId: string, options: Record<string, any> = {}): Promise<Record<string, any>[]> {
    try {
      console.log(`Fetching members for list ID ${listId}...`);

      // First, ensure the list exists
      const list = await this.getListById(listId);
      if (!list) {
        throw new Error(`List with ID ${listId} not found`);
      }

      let queryParams: any = {
        $page: options.page || 1,
        $pageSize: options.pageSize || 50,
      };

      // Add any additional filters
      if (options.filters) {
        queryParams = { ...queryParams, ...options.filters };
      }

      const response = await this.client.get({
        uri: `asset/v1/content/lists/${listId}/subscribers`,
        qs: queryParams,
      });

      console.log(`List members API response: ${response.statusCode}`);

      if (response.statusCode >= 400) {
        console.error(`Error fetching list members: ${response.statusCode}`, response.body);
        throw new Error(`Failed to fetch list members: ${JSON.stringify(response.body)}`);
      }

      return response.body.items || [];
    } catch (e) {
      console.error('Error in getListMembers:', e);
      throw e;
    }
  }

  /**
   * Adds a contact to a list in SFMC.
   */
  public async addContactToList(listId: string, contactKey: string): Promise<Record<string, any>> {
    try {
      console.log(`Adding contact ${contactKey} to list ${listId}...`);

      // First, ensure the list exists
      const list = await this.getListById(listId);
      if (!list) {
        throw new Error(`List with ID ${listId} not found`);
      }

      const payload = {
        contactKey,
        listId,
      };

      const response = await this.client.post({
        uri: `asset/v1/content/lists/${listId}/subscribers`,
        body: JSON.stringify(payload),
      });

      console.log(`Add contact to list response: ${response.statusCode}`);

      if (response.statusCode >= 400) {
        console.error(`Error adding contact to list: ${response.statusCode}`, response.body);
        throw new Error(`Failed to add contact to list: ${JSON.stringify(response.body)}`);
      }

      return response.body;
    } catch (e) {
      console.error('Error adding contact to list:', e);
      throw e;
    }
  }

  /**
   * Removes a contact from a list in SFMC.
   */
  public async removeContactFromList(listId: string, contactKey: string): Promise<boolean> {
    try {
      console.log(`Removing contact ${contactKey} from list ${listId}...`);

      // First, ensure the list exists
      const list = await this.getListById(listId);
      if (!list) {
        throw new Error(`List with ID ${listId} not found`);
      }

      const response = await this.client.delete({
        uri: `asset/v1/content/lists/${listId}/subscribers/${contactKey}`,
      });

      console.log(`Remove contact from list response: ${response.statusCode}`);

      if (response.statusCode >= 400) {
        console.error(`Error removing contact from list: ${response.statusCode}`, response.body);
        throw new Error(`Failed to remove contact from list: ${JSON.stringify(response.body)}`);
      }

      return true;
    } catch (e) {
      console.error('Error removing contact from list:', e);
      throw e;
    }
  }
}
