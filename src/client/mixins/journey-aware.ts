import * as util from '@run-crank/utilities';

export class JourneyAwareMixin {
  client: any;

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Gets a single journey by ID from SFMC.
   */
  public async getJourneyById(journeyId: string, extras: string = ''): Promise<Record<string, any>> {
    try {
      const params: any = {
        id: journeyId,
      };

      if (extras) {
        params.extras = extras;
      }

      console.log(`Fetching journey with ID ${journeyId}...`);

      const response = await this.client.get({
        uri: 'interaction/v1/interactions',
        qs: params,
      });

      console.log(`Journey API response (getById): ${response.statusCode}`);

      if (response.statusCode >= 400) {
        console.error(`Error fetching journey: ${response.statusCode}`, response.body);
        return null;
      }

      if (response.body.items && response.body.items.length) {
        console.log(`Journey found with ID ${journeyId}`);
        return response.body.items[0];
      }

      console.log(`No journey found with ID ${journeyId}`);
      return null;
    } catch (e) {
      console.error('Error in getJourneyById:', e);
      if (e.response && e.response.statusCode === 404) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Gets a single journey by key from SFMC.
   */
  public async getJourneyByKey(journeyKey: string, extras: string = ''): Promise<Record<string, any>> {
    try {
      const params: any = {
        key: journeyKey,
      };

      if (extras) {
        params.extras = extras;
      }

      console.log(`Fetching journey with key ${journeyKey}...`);
      console.log('Request params:', JSON.stringify(params, null, 2));

      const response = await this.client.get({
        uri: 'interaction/v1/interactions',
        qs: params,
      });

      console.log(`Journey API response (getByKey): ${response.statusCode}`);
      console.log('Journey API response body:', JSON.stringify(response.body, null, 2));

      if (response.statusCode >= 400) {
        console.error(`Error fetching journey by key: ${response.statusCode}`, response.body);
        return null;
      }

      if (response.body.items && response.body.items.length) {
        console.log(`Journey found with key ${journeyKey}`);
        console.log('Journey data:', JSON.stringify(response.body.items[0], null, 2));
        return response.body.items[0];
      }

      console.log(`No journey found with key ${journeyKey}`);
      return null;
    } catch (e) {
      console.error('Error in getJourneyByKey:', e);
      if (e.response && e.response.statusCode === 404) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Creates a journey in SFMC.
   */
  public async createJourney(journeyDefinition: Record<string, any>): Promise<Record<string, any>> {
    try {
      // Ensure required fields are present
      if (!journeyDefinition.name) {
        throw new Error('Journey name is required');
      }

      // Use the provided key or generate a unique key if not provided
      const key = journeyDefinition.key || `journey-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      console.log('Journey key to be used:', key);

      // Add a prefix to the key if it doesn't have one already
      // SFMC sometimes ignores custom keys that don't follow its naming patterns
      const formattedKey = key.includes('-') ? key : `journey-${key}-${Date.now().toString().substr(-4)}`;

      // Format the journey definition according to SFMC API requirements
      const formattedJourney = {
        key: formattedKey,
        name: journeyDefinition.name,
        description: journeyDefinition.description || '',
        workflowApiVersion: journeyDefinition.workflowApiVersion || 1.0,
        triggers: journeyDefinition.triggers || [],
        goals: journeyDefinition.goals || [],
        activities: journeyDefinition.activities || [],
        // Don't include these fields as per the API docs:
        // id, lastPublishedDate, createdDate, modifiedDate, status, definitionId
      };

      console.log('Creating journey with payload:', JSON.stringify(formattedJourney, null, 2));

      const response = await this.client.post({
        uri: 'interaction/v1/interactions',
        body: JSON.stringify(formattedJourney),
      });

      console.log('Journey API response status:', response.statusCode);
      console.log('Journey API response body:', JSON.stringify(response.body, null, 2));

      if (response.statusCode >= 400) {
        throw new Error(`Journey creation failed with status ${response.statusCode}: ${JSON.stringify(response.body)}`);
      }

      // Log the actual key returned by the API
      if (response.body && response.body.key) {
        console.log('Journey created with key from API:', response.body.key);

        // If API returned a different key than we requested, warn about it
        if (response.body.key !== formattedKey) {
          console.warn(`Warning: API returned a different key (${response.body.key}) than requested (${formattedKey})`);
        }
      } else {
        console.log('Warning: No key found in journey creation response');
      }

      return response.body;
    } catch (e) {
      console.error('Error creating journey:', e);
      throw e;
    }
  }

  /**
   * Updates a journey in SFMC.
   */
  public async updateJourney(journeyId: string, journeyDefinition: Record<string, any>): Promise<Record<string, any>> {
    try {
      // First, get the current journey to merge with updates
      let currentJourney = await this.getJourneyById(journeyId);

      // If not found by ID, try by key
      if (!currentJourney) {
        currentJourney = await this.getJourneyByKey(journeyId);
      }

      if (!currentJourney) {
        console.error(`Journey with ID/key ${journeyId} not found in updateJourney`);
        throw new Error(`Journey with ID/key ${journeyId} not found`);
      }

      console.log('Current journey found:', currentJourney.id, currentJourney.key, currentJourney.name);

      // Format the journey definition according to SFMC API requirements
      const formattedJourney = {
        key: currentJourney.key, // Keep the original key
        name: journeyDefinition.name || currentJourney.name,
        description: journeyDefinition.description || currentJourney.description || '',
        workflowApiVersion: journeyDefinition.workflowApiVersion || currentJourney.workflowApiVersion || 1.0,
        triggers: journeyDefinition.triggers || currentJourney.triggers || [],
        goals: journeyDefinition.goals || currentJourney.goals || [],
        activities: journeyDefinition.activities || currentJourney.activities || [],
        // Don't include these fields as per the API docs:
        // id, lastPublishedDate, createdDate, modifiedDate, status, definitionId
      };

      console.log(`Updating journey with ID ${currentJourney.id}...`);
      console.log('Update payload:', JSON.stringify(formattedJourney, null, 2));

      // Use formattedJourney.key directly in the URI, not currentJourney.id
      // Try the interaction/v1/interactions/key:{key} format
      const response = await this.client.put({
        uri: `interaction/v1/interactions/key:${formattedJourney.key}`,
        body: JSON.stringify(formattedJourney),
      });

      console.log(`Journey update response status: ${response.statusCode}`);
      console.log('Journey update response body:', JSON.stringify(response.body, null, 2));

      if (response.statusCode >= 400) {
        console.error(`Error updating journey: ${response.statusCode}`, response.body);
        throw new Error(`Journey update failed with status ${response.statusCode}: ${JSON.stringify(response.body)}`);
      }

      // After successful update, return the updated journey data
      // Delay slightly to allow the API to process the update
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updatedJourney = await this.getJourneyByKey(formattedJourney.key);
      console.log('Journey updated successfully, fetched updated journey data');

      return updatedJourney || response.body;
    } catch (e) {
      console.error('Error in updateJourney:', e);
      throw e;
    }
  }

  /**
   * Deletes a journey in SFMC.
   */
  public async deleteJourney(journeyId: string): Promise<boolean> {
    try {
      console.log(`Deleting journey with ID ${journeyId}...`);

      const response = await this.client.delete({
        uri: `interaction/v1/interactions/${journeyId}`,
      });

      console.log(`Journey deletion response: ${response.statusCode}`);

      if (response.statusCode >= 400 && response.statusCode !== 404) {
        console.error(`Error deleting journey: ${response.statusCode}`, response.body);
        throw new Error(`Journey deletion failed with status ${response.statusCode}: ${JSON.stringify(response.body)}`);
      }

      return response.statusCode !== 404;
    } catch (e) {
      console.error('Error in deleteJourney:', e);
      if (e.response && e.response.statusCode === 404) {
        console.log(`Journey with ID ${journeyId} not found for deletion`);
        return false;
      }
      throw e;
    }
  }

  /**
   * Activates a journey in SFMC.
   */
  public async activateJourney(journeyId: string): Promise<Record<string, any>> {
    try {
      // First, get the current journey to ensure we have the correct ID
      let currentJourney = await this.getJourneyById(journeyId);

      // If not found by ID, try by key
      if (!currentJourney) {
        currentJourney = await this.getJourneyByKey(journeyId);
      }

      if (!currentJourney) {
        console.error(`Journey with ID/key ${journeyId} not found`);
        throw new Error(`Journey with ID/key ${journeyId} not found`);
      }

      console.log(`Activating journey with ID ${currentJourney.id} and key ${currentJourney.key}...`);

      // Try both forms of the activation endpoint - SFMC documentation is inconsistent
      let response;

      try {
        // First try the /key:{key}/start format
        console.log('Trying activation with /key:{key}/start format...');
        response = await this.client.post({
          uri: `interaction/v1/interactions/key:${currentJourney.key}/start`,
          body: JSON.stringify({}),
        });
      } catch (e) {
        console.log('First activation attempt failed, trying alternate endpoint...');

        // Then try the direct ID format if that fails
        response = await this.client.post({
          uri: `interaction/v1/interactions/${currentJourney.id}/start`,
          body: JSON.stringify({}),
        });
      }

      console.log(`Journey activation response status: ${response.statusCode}`);
      console.log('Journey activation response body:', JSON.stringify(response.body, null, 2));

      if (response.statusCode >= 400) {
        console.error(`Error activating journey: ${response.statusCode}`, response.body);

        // WORKAROUND: Some SFMC instances return a 404 but the journey is still activated
        // Let's check if the journey status was updated despite the error
        await new Promise(resolve => setTimeout(resolve, 1000));
        const checkJourney = await this.getJourneyByKey(currentJourney.key);

        if (checkJourney && checkJourney.status === 'Published') {
          console.log('Journey appears to be published despite API error. Proceeding...');
          return checkJourney;
        } else {
          throw new Error(`Journey activation failed with status ${response.statusCode}: ${JSON.stringify(response.body)}`);
        }
      }

      // Wait a moment for the status to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the updated journey to verify status change
      const updatedJourney = await this.getJourneyByKey(currentJourney.key);
      console.log(`Journey activation complete, new status: ${updatedJourney?.status || 'Unknown'}`);

      return updatedJourney || response.body;
    } catch (e) {
      console.error('Error in activateJourney:', e);
      throw e;
    }
  }

  /**
   * Gets the status of a journey in SFMC.
   */
  public async getJourneyStatus(journeyId: string): Promise<string> {
    try {
      const journey = await this.getJourneyById(journeyId);
      return journey?.status || null;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Adds a contact to a journey in SFMC.
   */
  public async addContactToJourney(journeyKey: string, contactKey: string, data: Record<string, any> = {}): Promise<Record<string, any>> {
    try {
      const payload = {
        ContactKey: contactKey,
        ...data,
      };

      console.log(`Adding contact ${contactKey} to journey with key ${journeyKey}...`);
      console.log('Contact data:', JSON.stringify(payload, null, 2));

      const response = await this.client.post({
        uri: 'interaction/v1/events',
        qs: {
          eventDefinitionKey: journeyKey,
        },
        body: JSON.stringify(payload),
      });

      console.log(`Add contact to journey response: ${response.statusCode}`);

      if (response.statusCode >= 400) {
        console.error(`Error adding contact to journey: ${response.statusCode}`, response.body);
        throw new Error(`Adding contact to journey failed with status ${response.statusCode}: ${JSON.stringify(response.body)}`);
      }

      return response.body;
    } catch (e) {
      console.error('Error in addContactToJourney:', e);
      throw e;
    }
  }

  /**
   * Checks if a contact is in a journey
   */
  public async isContactInJourney(contactKey: string, journeyId?: string): Promise<boolean> {
    try {
      const payload = {
        ContactKeyList: [contactKey],
      };

      console.log(`Checking if contact ${contactKey} is in ${journeyId ? `journey ${journeyId}` : 'any journey'}...`);

      const response = await this.client.post({
        uri: 'interaction/v1/interactions/contactMembership',
        body: JSON.stringify(payload),
      });

      console.log(`Contact in journey check response: ${response.statusCode}`);

      if (response.statusCode >= 400) {
        console.error(`Error checking if contact is in journey: ${response.statusCode}`, response.body);
        throw new Error(`Contact in journey check failed with status ${response.statusCode}: ${JSON.stringify(response.body)}`);
      }

      if (response.body.results && response.body.results.contactMemberships && response.body.results.contactMemberships.length) {
        if (journeyId) {
          const inJourney = response.body.results.contactMemberships.some(
            (membership: any) => membership.definitionKey === journeyId,
          );
          console.log(`Contact ${contactKey} ${inJourney ? 'is' : 'is not'} in journey ${journeyId}`);
          return inJourney;
        }
        console.log(`Contact ${contactKey} is in at least one journey`);
        return true;
      }

      console.log(`Contact ${contactKey} is not in any journey`);
      return false;
    } catch (e) {
      console.error('Error in isContactInJourney:', e);
      throw e;
    }
  }
}
