interface Attribute {
  id: string;
  key: string;
  name: {
    value: string;
  };
  storageName: string;
  dataType: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isReadOnly: boolean;
  displayOrder: number;
  ranges: any[];
  description: string;
  dataSourceID: number;
  restrictedValues: any[];
  fullyQualifiedName: string;
  parentId: string;
  isSystemDefined: boolean;
  isIdentityValue: boolean;
  isHidden: boolean;
  isUpdateable: boolean;
  parentType: string;
  dataSourceName: any;
  links: any;
  objectState: string;
}

interface AttributeSet {
  id: string;
  key: string;
  name: any;
  attributes: Attribute[];
}

interface SchemaResponse {
  items: AttributeSet[];
}

export class ContactAwareMixin {
  client: any;

  public async getContactByKey(contactKey: string): Promise<Object> {
    try {
      console.log('Establishing contact by key...');
      const establishResponse = await this.client.post({
        uri: 'contacts/v1/establish',
        body: JSON.stringify({
          contactKeys: [contactKey],
          returnResults: true,
          correlateResponseItem: true,
        }),
      });

      const contact = establishResponse.body.items?.[0]?.value?.contactReference;
      if (!contact) {
        console.error(`No contact found for contact key: ${contactKey}`);
        return null;
      }

      return contact;
    } catch (error) {
      console.error('Error fetching contact by key:', error);
      return null;
    }
  }

  public async getContactByEmail(email: string): Promise<Object> {
    try {
      console.log('Searching for contact by email...');
      const emailSearchResponse = await this.client.post({
        uri: 'contacts/v1/addresses/email/search',
        body: JSON.stringify({
          channelAddressList: [email],
          maximumCount: 1,
        }),
      });

      const contactKey = emailSearchResponse.body.channelAddressResponseEntities?.[0]?.contactKeyDetails?.[0]?.contactKey;

      if (!contactKey) {
        console.error('No contact found by email');
        return null;
      }

      return this.getContactByKey(contactKey);
    } catch (error) {
      console.error('Error fetching contact by email:', error);
      return null;
    }
  }

  public async getSchema(): Promise<SchemaResponse> {
    try {
      console.log('Fetching attribute set definitions...');
      const response = await this.client.get({
        uri: 'contacts/v1/attributeSetDefinitions',
      });

      if (response.body.hasErrors) {
        console.error('Error fetching attribute sets:', response.body.resultMessages);
        return null;
      }

      return response.body;
    } catch (error) {
      console.error('Error fetching attribute sets:', error);
      return null;
    }
  }

  public async createContact(contact: any): Promise<Object> {
    try {
      console.log('Creating contact...');

      // First get the schema to understand available fields
      const schema = await this.getSchema();
      if (!schema) {
        throw new Error('Failed to fetch schema');
      }

      // Find the required attribute sets
      const emailAddressesSet = schema.items.find(item => item.key === 'EmailAddresses');
      const emailDemographicsSet = schema.items.find(item => item.key === 'EmailDemographics');

      if (!emailAddressesSet) {
        throw new Error('EmailAddresses attribute set not found');
      }

      // Generate a unique contact key if not provided
      const contactKey = contact.contactKey || `${contact.email}_${Date.now()}`;

      // Build attribute sets array
      const attributeSets = [];

      // Add Email Addresses attribute set (required)
      attributeSets.push({
        name: emailAddressesSet.name.value,
        items: [{
          values: [
            {
              name: 'Email Address',
              value: contact.email,
            },
            {
              name: 'HTML Enabled',
              value: contact.htmlEnabled !== undefined ? contact.htmlEnabled : true,
            },
          ],
        }],
      });

      // Add Email Demographics attribute set for firstname, lastname, etc.
      if (emailDemographicsSet) {
        const demographicsValues = [];

        // Map common contact fields to demographics
        // First, check if standard demographic fields exist in the schema
        const firstNameAttr = this.findAttribute(emailDemographicsSet.attributes, 'First Name');
        const lastNameAttr = this.findAttribute(emailDemographicsSet.attributes, 'Last Name');
        const companyAttr = this.findAttribute(emailDemographicsSet.attributes, 'Company');

        // Only add values for attributes that exist in the schema
        if (firstNameAttr && contact.firstname) {
          demographicsValues.push({
            name: 'First Name',
            value: contact.firstname,
          });
        }

        if (lastNameAttr && contact.lastname) {
          demographicsValues.push({
            name: 'Last Name',
            value: contact.lastname,
          });
        }

        if (companyAttr && contact.company) {
          demographicsValues.push({
            name: 'Company',
            value: contact.company,
          });
        }

        // Add any other fields that might be in the contact data and exist in the schema
        // This allows for dynamic addition of custom attributes
        Object.keys(contact).forEach((key) => {
          // Skip fields we've already processed
          if (['email', 'firstname', 'lastname', 'company', 'contactKey', 'htmlEnabled'].includes(key)) {
            return;
          }

          // Convert camelCase to Title Case for attribute lookup
          const attributeName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          const attribute = this.findAttribute(emailDemographicsSet.attributes, attributeName);

          if (attribute && contact[key]) {
            demographicsValues.push({
              name: attributeName,
              value: contact[key],
            });
          }
        });

        // Only add the demographics attribute set if we have values to add
        if (demographicsValues.length > 0) {
          attributeSets.push({
            name: emailDemographicsSet.name.value,
            items: [{
              values: demographicsValues,
            }],
          });
        }
      }

      // Create the formatted contact payload
      const formattedContact = {
        contactKey,
        attributeSets,
      };

      console.log('Formatted contact data:', JSON.stringify(formattedContact, null, 2));

      // Create the contact
      const response = await this.client.post({
        uri: 'contacts/v1/contacts',
        body: JSON.stringify(formattedContact),
      });

      // Check for error response
      if (response.body.hasErrors) {
        console.error('Error creating contact:', JSON.stringify(response.body.resultMessages, null, 2));

        // If we got a contact ID despite the error, return partial success
        if (response.body.contactID) {
          console.log('Contact was created with ID:', response.body.contactID);
          return {
            contactKey: response.body.contactKey,
            contactId: response.body.contactID,
            operationStatus: response.body.operationStatus,
            errors: response.body.resultMessages,
          };
        }

        return null;
      }

      // Check if response has the expected structure
      if (!response.body.contactKey || !response.body.contactId) {
        console.error('Invalid response structure:', JSON.stringify(response.body, null, 2));
        return null;
      }

      return response.body;
    } catch (error) {
      console.error('Error creating contact:', error);
      if (error.response?.body) {
        console.error('Error response body:', JSON.stringify(error.response.body, null, 2));
      }
      return null;
    }
  }

  // Helper function to find an attribute by name in an array of attributes
  private findAttribute(attributes, name) {
    return attributes.find(attr =>
      attr.name &&
      attr.name.value &&
      attr.name.value.toLowerCase() === name.toLowerCase(),
    );
  }

  public async updateContact(contactKey: string, contact: any): Promise<Object> {
    try {
      console.log(`Updating contact with key: ${contactKey}`);

      // First get the schema to understand available fields
      const schema = await this.getSchema();
      if (!schema) {
        throw new Error('Failed to fetch schema');
      }

      // Find the required attribute sets
      const emailAddressesSet = schema.items.find(item => item.key === 'EmailAddresses');
      const emailDemographicsSet = schema.items.find(item => item.key === 'EmailDemographics');

      if (!emailAddressesSet) {
        throw new Error('EmailAddresses attribute set not found');
      }

      // Build attribute sets array
      const attributeSets = [];

      // Add Email Demographics attribute set for firstname, lastname, etc. if present in schema
      if (emailDemographicsSet) {
        const demographicsValues = [];

        // Map common contact fields to demographics
        // First, check if standard demographic fields exist in the schema
        const firstNameAttr = this.findAttribute(emailDemographicsSet.attributes, 'First Name');
        const lastNameAttr = this.findAttribute(emailDemographicsSet.attributes, 'Last Name');
        const companyAttr = this.findAttribute(emailDemographicsSet.attributes, 'Company');

        // Only add values for attributes that exist in the schema and in the contact update
        if (firstNameAttr && contact.firstname) {
          demographicsValues.push({
            name: 'First Name',
            value: contact.firstname,
          });
        }

        if (lastNameAttr && contact.lastname) {
          demographicsValues.push({
            name: 'Last Name',
            value: contact.lastname,
          });
        }

        if (companyAttr && contact.company) {
          demographicsValues.push({
            name: 'Company',
            value: contact.company,
          });
        }

        // Add any other fields that might be in the contact data and exist in the schema
        Object.keys(contact).forEach((key) => {
          // Skip fields we've already processed
          if (['contactKey', 'email', 'firstname', 'lastname', 'company', 'htmlEnabled'].includes(key)) {
            return;
          }

          // Convert camelCase to Title Case for attribute lookup
          const attributeName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          const attribute = this.findAttribute(emailDemographicsSet.attributes, attributeName);

          if (attribute && contact[key]) {
            demographicsValues.push({
              name: attributeName,
              value: contact[key],
            });
          }
        });

        // Only add the demographics attribute set if we have values to add
        if (demographicsValues.length > 0) {
          attributeSets.push({
            name: emailDemographicsSet.name.value,
            items: [{
              values: demographicsValues,
            }],
          });
        }
      }

      // Add Email Addresses attribute set if email is being updated
      if (contact.email) {
        attributeSets.push({
          name: emailAddressesSet.name.value,
          items: [{
            values: [
              {
                name: 'Email Address',
                value: contact.email,
              },
            ],
          }],
        });

        // Add HTML Enabled if specified
        if (contact.htmlEnabled !== undefined) {
          attributeSets[attributeSets.length - 1].items[0].values.push({
            name: 'HTML Enabled',
            value: contact.htmlEnabled,
          });
        }
      }

      // Create the formatted contact payload
      const formattedContact = {
        contactKey,
        attributeSets,
      };

      console.log('Formatted contact update data:', JSON.stringify(formattedContact, null, 2));

      // Update the contact using PATCH
      const response = await this.client.patch({
        uri: 'contacts/v1/contacts',
        body: JSON.stringify(formattedContact),
      });

      if (response.body.hasErrors) {
        console.error('Error updating contact:', response.body.resultMessages);
        return null;
      }

      return response.body;
    } catch (error) {
      console.error('Error updating contact:', error);
      if (error.response?.body) {
        console.error('Error response body:', JSON.stringify(error.response.body, null, 2));
      }
      return null;
    }
  }

  public async deleteContact(contactKey: string): Promise<Object> {
    try {
      console.log(`Deleting contact with key: ${contactKey}`);

      // First get the contact to make sure it exists
      const contact = await this.getContact(contactKey);
      if (!contact) {
        console.error(`No contact found with key: ${contactKey}`);
        return null;
      }

      const response = await this.client.delete({
        uri: `contacts/v1/contacts/${contactKey}`,
      });

      if (response.body.hasErrors) {
        console.error('Error deleting contact:', response.body.resultMessages);
        return null;
      }

      // Return a consistent structure regardless of what the API returns
      return {
        contactKey,
        contactId: (contact as any).contactID,
        operationStatus: response.body.operationStatus || 'OK',
      };
    } catch (error) {
      console.error('Error deleting contact:', error);
      if (error.response?.body) {
        console.error('Error response body:', JSON.stringify(error.response.body, null, 2));
      }
      return null;
    }
  }

  public async getContact(contactKey: string): Promise<Object> {
    try {
      console.log(`Getting contact with key: ${contactKey}`);

      // Use the establish endpoint which is more reliable for retrieving contacts
      const response = await this.client.post({
        uri: 'contacts/v1/establish',
        body: JSON.stringify({
          contactKeys: [contactKey],
          returnResults: true,
          correlateResponseItem: true,
        }),
      });

      // Check if we have a contact in the response
      const contactReference = response.body.items?.[0]?.value?.contactReference;
      if (!contactReference) {
        console.error(`No contact found for contact key: ${contactKey}`);
        return null;
      }

      // Format the contact with consistent property names
      const contact = {
        contactKey: contactReference.contactKey,
        contactID: contactReference.contactID,
        contactStatus: contactReference.contactStatus || 'Unknown',
        modifiedDate: contactReference.modifiedDate,
      };

      console.log('Found contact:', `ID=${contact.contactID}, Key=${contact.contactKey}`);
      return contact;
    } catch (error) {
      console.error('Error retrieving contact by key:', error);
      return null;
    }
  }
}
