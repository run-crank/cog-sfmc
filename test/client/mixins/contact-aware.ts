import { expect, use } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { ContactAwareMixin } from '../../../src/client/mixins/contact-aware';
import { StepDefinition, FieldDefinition } from '../../../src/proto/cog_pb';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { RunStepResponse } from '../../../src/proto/cog_pb';
import { describe, it, beforeEach } from 'mocha';
import { SinonStub } from 'sinon';

// Extend Chai with Sinon-Chai
use(sinonChai);

describe('ContactAwareMixin', () => {
  let contactAware: ContactAwareMixin;
  let clientStub: {
    post: SinonStub;
    get: SinonStub;
    put: SinonStub;
    delete: SinonStub;
    patch: SinonStub;
  };

  beforeEach(() => {
    clientStub = {
      post: sinon.stub(),
      get: sinon.stub(),
      put: sinon.stub(),
      delete: sinon.stub(),
      patch: sinon.stub(),
    };
    contactAware = new ContactAwareMixin();
    contactAware.client = clientStub;
  });

  describe('getContactByKey', () => {
    it('should call post with expected parameters', async () => {
      const contactKey = 'test_contact_123';
      const expectedResponse = {
        body: {
          items: [{
            value: {
              contactReference: {
                contactKey,
                contactId: '123',
                operationStatus: 'success',
              },
            },
          }],
        },
      };
      clientStub.post.resolves(expectedResponse);

      const result = await contactAware.getContactByKey(contactKey);

      expect(clientStub.post).to.have.been.calledWith({
        uri: 'contacts/v1/establish',
        body: JSON.stringify({
          contactKeys: [contactKey],
          returnResults: true,
          correlateResponseItem: true,
        }),
      });
      expect(result).to.deep.equal(expectedResponse.body.items[0].value.contactReference);
    });

    it('should return null when no contact found', async () => {
      const contactKey = 'test_contact_123';
      clientStub.post.resolves({
        body: {
          items: [],
        },
      });

      const result = await contactAware.getContactByKey(contactKey);
      expect(result).to.be.null;
    });

    it('should return null on error', async () => {
      const contactKey = 'test_contact_123';
      clientStub.post.rejects(new Error('API Error'));

      const result = await contactAware.getContactByKey(contactKey);
      expect(result).to.be.null;
    });
  });

  describe('getContactByEmail', () => {
    it('should call post and getContactByKey with expected parameters', async () => {
      const email = 'test@example.com';
      const contactKey = 'test_contact_123';
      const expectedResponse = {
        body: {
          channelAddressResponseEntities: [{
            contactKeyDetails: [{
              contactKey,
            }],
          }],
        },
      };
      clientStub.post.resolves(expectedResponse);
      contactAware.getContactByKey = sinon.stub().resolves({
        contactKey,
        contactId: '123',
        operationStatus: 'success',
      });

      const result = await contactAware.getContactByEmail(email);

      expect(clientStub.post).to.have.been.calledWith({
        uri: 'contacts/v1/addresses/email/search',
        body: JSON.stringify({
          channelAddressList: [email],
          maximumCount: 1,
        }),
      });
      expect(contactAware.getContactByKey).to.have.been.calledWith(contactKey);
      expect(result).to.deep.equal({
        contactKey,
        contactId: '123',
        operationStatus: 'success',
      });
    });

    it('should return null when no contact found', async () => {
      const email = 'test@example.com';
      clientStub.post.resolves({
        body: {
          channelAddressResponseEntities: [],
        },
      });

      const result = await contactAware.getContactByEmail(email);
      expect(result).to.be.null;
    });

    it('should return null on error', async () => {
      const email = 'test@example.com';
      clientStub.post.rejects(new Error('API Error'));

      const result = await contactAware.getContactByEmail(email);
      expect(result).to.be.null;
    });
  });

  describe('createContact', () => {
    it('should call post with expected parameters', async () => {
      // Mock schema response
      const schemaResponse = {
        body: {
          items: [
            {
              key: 'EmailAddresses',
              name: { value: 'Email Addresses' },
              attributes: [
                { 
                  key: 'emailAddress',
                  name: { value: 'Email Address' },
                  dataType: 'string',
                  isPrimaryKey: true,
                },
                {
                  key: 'htmlEnabled',
                  name: { value: 'HTML Enabled' },
                  dataType: 'boolean',
                  isPrimaryKey: false,
                }
              ]
            },
            {
              key: 'EmailDemographics',
              name: { value: 'Email Demographics' },
              attributes: [
                {
                  key: 'firstName',
                  name: { value: 'First Name' },
                  dataType: 'string',
                  isPrimaryKey: false,
                },
                {
                  key: 'lastName',
                  name: { value: 'Last Name' },
                  dataType: 'string',
                  isPrimaryKey: false,
                }
              ]
            }
          ]
        }
      };
      
      // Setup stubs
      clientStub.get.resolves(schemaResponse);
      
      const contact = {
        contactKey: 'test_contact_123',
        email: 'test@example.com',
        firstname: 'John',
        lastname: 'Doe',
      };
      
      const createResponse = {
        body: {
          contactKey: contact.contactKey,
          contactId: '123',
          operationStatus: 'success',
        },
      };
      
      // Reset post stub before setting specific behavior
      clientStub.post.reset();
      clientStub.post.resolves(createResponse);

      const result = await contactAware.createContact(contact);

      // Verify schema was fetched
      expect(clientStub.get).to.have.been.calledWith({
        uri: 'contacts/v1/attributeSetDefinitions',
      });
      
      // Verify the contact creation call was made with the correct structure
      expect(clientStub.post).to.have.been.calledWith(sinon.match({
        uri: 'contacts/v1/contacts',
      }));
      
      // Find the call that matches our create contact endpoint
      const postCalls = clientStub.post.getCalls();
      const createCall = postCalls.find(call => call.args[0].uri === 'contacts/v1/contacts');
      expect(createCall).to.not.be.undefined;
      
      // Only proceed with further assertions if createCall exists
      if (createCall) {
        // Parse the body to ensure the format matches our expectations
        const body = JSON.parse(createCall.args[0].body);
        expect(body.contactKey).to.equal(contact.contactKey);
        expect(body.attributeSets).to.be.an('array');
        
        // Check that attributeSets contains the expected structure
        const emailAddressesSet = body.attributeSets.find(set => set.name === 'Email Addresses');
        expect(emailAddressesSet).to.not.be.undefined;
        expect(emailAddressesSet.items[0].values).to.deep.include({
          name: 'Email Address',
          value: contact.email,
        });
        
        const emailDemographicsSet = body.attributeSets.find(set => set.name === 'Email Demographics');
        expect(emailDemographicsSet).to.not.be.undefined;
        expect(emailDemographicsSet.items[0].values).to.deep.include({
          name: 'First Name',
          value: contact.firstname,
        });
        expect(emailDemographicsSet.items[0].values).to.deep.include({
          name: 'Last Name',
          value: contact.lastname,
        });
      }
      
      // Verify result matches the expected response body
      expect(result).to.deep.equal(createResponse.body);
    });

    it('should return null on error', async () => {
      const contact = {
        contactKey: 'test_contact_123',
        email: 'test@example.com',
      };
      clientStub.get.rejects(new Error('API Error'));

      const result = await contactAware.createContact(contact);
      expect(result).to.be.null;
    });
  });

  describe('updateContact', () => {
    it('should call patch with expected parameters', async () => {
      // Mock schema response
      const schemaResponse = {
        body: {
          items: [
            {
              key: 'EmailAddresses',
              name: { value: 'Email Addresses' },
              attributes: [
                { 
                  key: 'emailAddress',
                  name: { value: 'Email Address' },
                  dataType: 'string',
                  isPrimaryKey: true,
                },
                {
                  key: 'htmlEnabled',
                  name: { value: 'HTML Enabled' },
                  dataType: 'boolean',
                  isPrimaryKey: false,
                }
              ]
            },
            {
              key: 'EmailDemographics',
              name: { value: 'Email Demographics' },
              attributes: [
                {
                  key: 'firstName',
                  name: { value: 'First Name' },
                  dataType: 'string',
                  isPrimaryKey: false,
                },
                {
                  key: 'lastName',
                  name: { value: 'Last Name' },
                  dataType: 'string',
                  isPrimaryKey: false,
                }
              ]
            }
          ]
        }
      };
      
      clientStub.get.resolves(schemaResponse);
      
      const contactKey = 'test_contact_123';
      const contact = {
        email: 'test@example.com',
      };
      
      const expectedResponse = {
        body: {
          contactKey,
          contactId: '123',
          operationStatus: 'success',
        },
      };
      
      clientStub.patch.resolves(expectedResponse);

      const result = await contactAware.updateContact(contactKey, contact);

      // Verify schema was fetched
      expect(clientStub.get).to.have.been.calledWith({
        uri: 'contacts/v1/attributeSetDefinitions',
      });
      
      // Verify the contact update call was made with the correct endpoint
      expect(clientStub.patch).to.have.been.called;
      const patchCall = clientStub.patch.getCall(0);
      expect(patchCall.args[0].uri).to.equal('contacts/v1/contacts');
      
      // Parse the body to ensure the format matches our expectations
      const body = JSON.parse(patchCall.args[0].body);
      expect(body.contactKey).to.equal(contactKey);
      expect(body.attributeSets).to.be.an('array');
      
      // Verify result
      expect(result).to.deep.equal(expectedResponse.body);
    });

    it('should return null on error', async () => {
      const contactKey = 'test_contact_123';
      const contact = {
        email: 'test@example.com',
      };
      clientStub.get.rejects(new Error('API Error'));

      const result = await contactAware.updateContact(contactKey, contact);
      expect(result).to.be.null;
    });
  });

  describe('deleteContact', () => {
    it('should call delete with expected parameters', async () => {
      const contactKey = 'test_contact_123';
      
      // First, mock the getContact call
      const getContactResponse = {
        body: {
          items: [{
            value: {
              contactReference: {
                contactKey,
                contactID: '123',
                contactStatus: 'Active',
              },
            },
          }],
        },
      };
      
      clientStub.post.resolves(getContactResponse);
      
      // Then, mock the delete call
      const deleteResponse = {
        body: {
          operationStatus: 'OK',
        },
      };
      
      clientStub.delete.resolves(deleteResponse);

      const result = await contactAware.deleteContact(contactKey);

      // Verify getContact was called first
      expect(clientStub.post).to.have.been.calledWith({
        uri: 'contacts/v1/establish',
        body: JSON.stringify({
          contactKeys: [contactKey],
          returnResults: true,
          correlateResponseItem: true,
        }),
      });
      
      // Verify the delete call
      expect(clientStub.delete).to.have.been.calledWith({
        uri: `contacts/v1/contacts/${contactKey}`,
      });
      
      // Verify the formatted result
      expect(result).to.deep.equal({
        contactKey,
        contactId: '123',
        operationStatus: 'OK',
      });
    });

    it('should return null on error', async () => {
      const contactKey = 'test_contact_123';
      clientStub.post.rejects(new Error('API Error'));

      const result = await contactAware.deleteContact(contactKey);
      expect(result).to.be.null;
    });
  });

  describe('getContact', () => {
    it('should call post with expected parameters', async () => {
      const contactKey = 'test_contact_123';
      const expectedResponse = {
        body: {
          items: [{
            value: {
              contactReference: {
                contactKey,
                contactID: '123',
                contactStatus: 'Active',
                modifiedDate: '2023-01-01',
              },
            },
          }],
        },
      };
      
      clientStub.post.resolves(expectedResponse);

      const result = await contactAware.getContact(contactKey);

      expect(clientStub.post).to.have.been.calledWith({
        uri: 'contacts/v1/establish',
        body: JSON.stringify({
          contactKeys: [contactKey],
          returnResults: true,
          correlateResponseItem: true,
        }),
      });
      
      // Verify the formatted result
      expect(result).to.deep.equal({
        contactKey,
        contactID: '123',
        contactStatus: 'Active',
        modifiedDate: '2023-01-01',
      });
    });

    it('should return null on error', async () => {
      const contactKey = 'test_contact_123';
      clientStub.post.rejects(new Error('API Error'));

      const result = await contactAware.getContact(contactKey);
      expect(result).to.be.null;
    });
  });
}); 