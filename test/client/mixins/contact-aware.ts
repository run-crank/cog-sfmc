import { expect } from 'chai';
import { ContactAwareMixin } from '../../../src/client/mixins/contact-aware';

describe('ContactAwareMixin', () => {
  let mixin: ContactAwareMixin;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      post: async () => ({})
    };
    mixin = new ContactAwareMixin();
    mixin.client = mockClient;
  });

  describe('getContactByKey', () => {
    it('should successfully retrieve a contact by key', async () => {
      const mockContact = {
        contactID: '123',
        contactKey: 'UI-001',
        contactStatus: 'Active'
      };

      mockClient.post = async () => ({
        body: {
          items: [{
            value: {
              contactReference: mockContact
            }
          }]
        }
      });

      const result = await mixin.getContactByKey('UI-001');
      expect(result).to.deep.equal(mockContact);
    });

    it('should return null when no contact is found', async () => {
      mockClient.post = async () => ({
        body: {
          items: []
        }
      });

      const result = await mixin.getContactByKey('NONEXISTENT');
      expect(result).to.be.null;
    });

    it('should handle API errors gracefully', async () => {
      mockClient.post = async () => {
        throw new Error('API Error');
      };

      const result = await mixin.getContactByKey('UI-001');
      expect(result).to.be.null;
    });
  });

  describe('getContactByEmail', () => {
    it('should successfully retrieve a contact by email', async () => {
      const mockContact = {
        contactID: '123',
        contactKey: 'UI-001',
        contactStatus: 'Active'
      };

      mockClient.post = async (params: any) => {
        if (params.uri === 'contacts/v1/addresses/email/search') {
          return {
            body: {
              channelAddressResponseEntities: [{
                contactKeyDetails: [{
                  contactKey: 'UI-001'
                }]
              }]
            }
          };
        }
        return {
          body: {
            items: [{
              value: {
                contactReference: mockContact
              }
            }]
          }
        };
      };

      const result = await mixin.getContactByEmail('test@example.com');
      expect(result).to.deep.equal(mockContact);
    });

    it('should return null when no contact is found by email', async () => {
      mockClient.post = async () => ({
        body: {
          channelAddressResponseEntities: []
        }
      });

      const result = await mixin.getContactByEmail('nonexistent@example.com');
      expect(result).to.be.null;
    });

    it('should handle API errors gracefully', async () => {
      mockClient.post = async () => {
        throw new Error('API Error');
      };

      const result = await mixin.getContactByEmail('test@example.com');
      expect(result).to.be.null;
    });
  });
}); 