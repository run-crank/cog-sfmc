import { expect, use } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { JourneyAwareMixin } from '../../../src/client/mixins/journey-aware';
import { StepDefinition, FieldDefinition } from '../../../src/proto/cog_pb';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { RunStepResponse } from '../../../src/proto/cog_pb';
import { describe, it, beforeEach } from 'mocha';
import { SinonStub } from 'sinon';

// Extend Chai with Sinon-Chai
use(sinonChai);

describe('JourneyAwareMixin', () => {
  let journeyAware: JourneyAwareMixin;
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
    journeyAware = new JourneyAwareMixin(clientStub);
  });

  describe('getJourneyById', () => {
    it('should call get with expected parameters', async () => {
      const journeyId = 'journey-123';
      const expectedResponse = {
        statusCode: 200,
        body: {
          items: [{
            id: journeyId,
            key: 'journey-key-123',
            name: 'Test Journey',
            status: 'Draft',
          }],
        },
      };
      clientStub.get.resolves(expectedResponse);

      const result = await journeyAware.getJourneyById(journeyId);

      expect(clientStub.get).to.have.been.calledWith({
        uri: 'interaction/v1/interactions',
        qs: { id: journeyId },
      });
      expect(result).to.deep.equal(expectedResponse.body.items[0]);
    });

    it('should handle extras parameter', async () => {
      const journeyId = 'journey-123';
      const extras = 'all';
      const expectedResponse = {
        statusCode: 200,
        body: {
          items: [{
            id: journeyId,
            key: 'journey-key-123',
            name: 'Test Journey',
            status: 'Draft',
          }],
        },
      };
      clientStub.get.resolves(expectedResponse);

      const result = await journeyAware.getJourneyById(journeyId, extras);

      expect(clientStub.get).to.have.been.calledWith({
        uri: 'interaction/v1/interactions',
        qs: { id: journeyId, extras },
      });
      expect(result).to.deep.equal(expectedResponse.body.items[0]);
    });

    it('should return null when no journey found', async () => {
      const journeyId = 'journey-123';
      clientStub.get.resolves({
        statusCode: 200,
        body: {
          items: [],
        },
      });

      const result = await journeyAware.getJourneyById(journeyId);
      expect(result).to.be.null;
    });

    it('should return null on error', async () => {
      const journeyId = 'journey-123';
      clientStub.get.resolves({
        statusCode: 404,
        body: {
          message: 'Not found',
        },
      });

      const result = await journeyAware.getJourneyById(journeyId);
      expect(result).to.be.null;
    });
  });

  describe('getJourneyByKey', () => {
    it('should call get with expected parameters', async () => {
      const journeyKey = 'journey-key-123';
      const expectedResponse = {
        statusCode: 200,
        body: {
          items: [{
            id: 'journey-123',
            key: journeyKey,
            name: 'Test Journey',
            status: 'Draft',
          }],
        },
      };
      clientStub.get.resolves(expectedResponse);

      const result = await journeyAware.getJourneyByKey(journeyKey);

      expect(clientStub.get).to.have.been.calledWith({
        uri: 'interaction/v1/interactions',
        qs: { key: journeyKey },
      });
      expect(result).to.deep.equal(expectedResponse.body.items[0]);
    });

    it('should handle extras parameter', async () => {
      const journeyKey = 'journey-key-123';
      const extras = 'all';
      const expectedResponse = {
        statusCode: 200,
        body: {
          items: [{
            id: 'journey-123',
            key: journeyKey,
            name: 'Test Journey',
            status: 'Draft',
          }],
        },
      };
      clientStub.get.resolves(expectedResponse);

      const result = await journeyAware.getJourneyByKey(journeyKey, extras);

      expect(clientStub.get).to.have.been.calledWith({
        uri: 'interaction/v1/interactions',
        qs: { key: journeyKey, extras },
      });
      expect(result).to.deep.equal(expectedResponse.body.items[0]);
    });

    it('should return null when no journey found', async () => {
      const journeyKey = 'journey-key-123';
      clientStub.get.resolves({
        statusCode: 200,
        body: {
          items: [],
        },
      });

      const result = await journeyAware.getJourneyByKey(journeyKey);
      expect(result).to.be.null;
    });

    it('should return null on error', async () => {
      const journeyKey = 'journey-key-123';
      clientStub.get.resolves({
        statusCode: 404,
        body: {
          message: 'Not found',
        },
      });

      const result = await journeyAware.getJourneyByKey(journeyKey);
      expect(result).to.be.null;
    });
  });

  describe('createJourney', () => {
    it('should call post with expected parameters', async () => {
      const journeyDefinition = {
        name: 'Test Journey',
        description: 'A test journey',
        key: 'test-journey-key',
        workflowApiVersion: 1.0,
        triggers: [],
        goals: [],
        activities: [],
      };
      const expectedResponse = {
        statusCode: 200,
        body: {
          id: 'journey-123',
          key: 'test-journey-key',
          name: 'Test Journey',
          description: 'A test journey',
          status: 'Draft',
        },
      };
      clientStub.post.resolves(expectedResponse);

      const result = await journeyAware.createJourney(journeyDefinition);

      // Check that post was called with the correct parameters
      const postCall = clientStub.post.getCall(0);
      const postArgs = postCall.args[0];
      expect(postArgs.uri).to.equal('interaction/v1/interactions');
      
      // Parse the body to check the content
      const parsedBody = JSON.parse(postArgs.body);
      expect(parsedBody.key).to.include('test-journey-key');
      expect(parsedBody.name).to.equal('Test Journey');
      expect(parsedBody.description).to.equal('A test journey');
      
      expect(result).to.deep.equal(expectedResponse.body);
    });

    it('should generate a key if not provided', async () => {
      const journeyDefinition = {
        name: 'Test Journey',
        description: 'A test journey',
      };
      const expectedResponse = {
        statusCode: 200,
        body: {
          id: 'journey-123',
          key: 'auto-generated-key',
          name: 'Test Journey',
          description: 'A test journey',
          status: 'Draft',
        },
      };
      clientStub.post.resolves(expectedResponse);

      const result = await journeyAware.createJourney(journeyDefinition);

      // Check that post was called with the correct parameters
      const postCall = clientStub.post.getCall(0);
      const postArgs = postCall.args[0];
      
      // Parse the body to check the content
      const parsedBody = JSON.parse(postArgs.body);
      expect(parsedBody.key).to.include('journey-'); // Should have the journey- prefix
      expect(parsedBody.name).to.equal('Test Journey');
      
      expect(result).to.deep.equal(expectedResponse.body);
    });

    it('should throw an error if name is not provided', async () => {
      const journeyDefinition = {
        description: 'A test journey',
      };

      try {
        await journeyAware.createJourney(journeyDefinition);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Journey name is required');
      }
    });

    it('should handle API errors', async () => {
      const journeyDefinition = {
        name: 'Test Journey',
        description: 'A test journey',
      };
      clientStub.post.resolves({
        statusCode: 400,
        body: {
          message: 'Bad request',
        },
      });

      try {
        await journeyAware.createJourney(journeyDefinition);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Journey creation failed with status 400');
      }
    });
  });

  describe('updateJourney', () => {
    beforeEach(() => {
      // Setup getJourneyById and getJourneyByKey stubs with proper typing
      (journeyAware.getJourneyById as SinonStub) = sinon.stub();
      (journeyAware.getJourneyByKey as SinonStub) = sinon.stub();
    });

    it('should call put with expected parameters when journey found by ID', async () => {
      const journeyId = 'journey-123';
      const journeyDefinition = {
        name: 'Updated Journey',
        description: 'An updated journey',
      };
      
      const existingJourney = {
        id: journeyId,
        key: 'journey-key-123',
        name: 'Original Journey',
        description: 'Original description',
        workflowApiVersion: 1.0,
        triggers: [],
        goals: [],
        activities: [],
        status: 'Draft',
      };
      
      const updatedJourney = {
        ...existingJourney,
        name: 'Updated Journey',
        description: 'An updated journey',
      };

      // Setup stubs
      (journeyAware.getJourneyById as SinonStub).resolves(existingJourney);
      (journeyAware.getJourneyByKey as SinonStub).resolves(null);
      
      clientStub.put.resolves({
        statusCode: 200,
        body: updatedJourney,
      });

      const result = await journeyAware.updateJourney(journeyId, journeyDefinition);

      // Verify getJourneyById was called
      expect(journeyAware.getJourneyById).to.have.been.calledWith(journeyId);
      
      // Check that put was called with the correct parameters
      const putCall = clientStub.put.getCall(0);
      const putArgs = putCall.args[0];
      
      expect(putArgs.uri).to.equal(`interaction/v1/interactions/key:${existingJourney.key}`);
      
      // Parse the body to check the content
      const parsedBody = JSON.parse(putArgs.body);
      expect(parsedBody.key).to.equal(existingJourney.key);
      expect(parsedBody.name).to.equal('Updated Journey');
      expect(parsedBody.description).to.equal('An updated journey');
      
      // Verify we fetch the updated journey
      expect(journeyAware.getJourneyByKey).to.have.been.calledWith(existingJourney.key);
    });

    it('should call put with expected parameters when journey found by key', async () => {
      const journeyKey = 'journey-key-123';
      const journeyDefinition = {
        name: 'Updated Journey',
        description: 'An updated journey',
      };
      
      const existingJourney = {
        id: 'journey-123',
        key: journeyKey,
        name: 'Original Journey',
        description: 'Original description',
        workflowApiVersion: 1.0,
        triggers: [],
        goals: [],
        activities: [],
        status: 'Draft',
      };
      
      // Setup stubs
      (journeyAware.getJourneyById as SinonStub).resolves(null);
      (journeyAware.getJourneyByKey as SinonStub).resolves(existingJourney);
      
      clientStub.put.resolves({
        statusCode: 200,
        body: {
          ...existingJourney,
          name: 'Updated Journey',
          description: 'An updated journey',
        },
      });

      const result = await journeyAware.updateJourney(journeyKey, journeyDefinition);

      // Verify getJourneyById and getJourneyByKey were called
      expect(journeyAware.getJourneyById).to.have.been.calledWith(journeyKey);
      expect(journeyAware.getJourneyByKey).to.have.been.calledWith(journeyKey);
      
      // Check that put was called with the correct parameters
      const putCall = clientStub.put.getCall(0);
      const putArgs = putCall.args[0];
      
      expect(putArgs.uri).to.equal(`interaction/v1/interactions/key:${journeyKey}`);
    });

    it('should throw an error if journey is not found', async () => {
      const journeyId = 'journey-123';
      const journeyDefinition = {
        name: 'Updated Journey',
      };
      
      // Setup stubs
      (journeyAware.getJourneyById as SinonStub).resolves(null);
      (journeyAware.getJourneyByKey as SinonStub).resolves(null);
      
      try {
        await journeyAware.updateJourney(journeyId, journeyDefinition);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal(`Journey with ID/key ${journeyId} not found`);
      }
    });
  });

  describe('deleteJourney', () => {
    it('should call delete with expected parameters', async () => {
      const journeyId = 'journey-123';
      clientStub.delete.resolves({
        statusCode: 200,
        body: {},
      });

      const result = await journeyAware.deleteJourney(journeyId);

      expect(clientStub.delete).to.have.been.calledWith({
        uri: `interaction/v1/interactions/${journeyId}`,
      });
      expect(result).to.be.true;
    });

    it('should handle 404 responses', async () => {
      const journeyId = 'journey-123';
      clientStub.delete.resolves({
        statusCode: 404,
        body: {
          message: 'Not found',
        },
      });

      const result = await journeyAware.deleteJourney(journeyId);
      expect(result).to.be.false;
    });

    it('should throw an error for other error statuses', async () => {
      const journeyId = 'journey-123';
      clientStub.delete.resolves({
        statusCode: 500,
        body: {
          message: 'Server error',
        },
      });

      try {
        await journeyAware.deleteJourney(journeyId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Journey deletion failed with status 500');
      }
    });
  });

  describe('activateJourney', () => {
    beforeEach(() => {
      // Setup getJourneyById and getJourneyByKey stubs with proper typing
      (journeyAware.getJourneyById as SinonStub) = sinon.stub();
      (journeyAware.getJourneyByKey as SinonStub) = sinon.stub();
    });

    it('should try key-based activation endpoint first', async () => {
      const journeyId = 'journey-123';
      const journeyKey = 'journey-key-123';
      
      const existingJourney = {
        id: journeyId,
        key: journeyKey,
        name: 'Test Journey',
        status: 'Draft',
      };
      
      // Setup stubs
      (journeyAware.getJourneyById as SinonStub).resolves(existingJourney);
      clientStub.post.resolves({
        statusCode: 200,
        body: {
          status: 'Published',
        },
      });

      const result = await journeyAware.activateJourney(journeyId);

      // Check that post was called with the key-based endpoint
      expect(clientStub.post).to.have.been.calledWith({
        uri: `interaction/v1/interactions/key:${journeyKey}/start`,
        body: '{}',
      });
    });

    it('should fall back to ID-based endpoint if key-based fails', async () => {
      const journeyId = 'journey-123';
      const journeyKey = 'journey-key-123';
      
      const existingJourney = {
        id: journeyId,
        key: journeyKey,
        name: 'Test Journey',
        status: 'Draft',
      };
      
      // Setup stubs
      (journeyAware.getJourneyById as SinonStub).resolves(existingJourney);
      
      // First post fails, second succeeds
      clientStub.post.onFirstCall().rejects(new Error('Not found'));
      clientStub.post.onSecondCall().resolves({
        statusCode: 200,
        body: {
          status: 'Published',
        },
      });

      const result = await journeyAware.activateJourney(journeyId);

      // Check that post was called with both endpoints
      expect(clientStub.post.firstCall).to.have.been.calledWith({
        uri: `interaction/v1/interactions/key:${journeyKey}/start`,
        body: '{}',
      });
      
      expect(clientStub.post.secondCall).to.have.been.calledWith({
        uri: `interaction/v1/interactions/${journeyId}/start`,
        body: '{}',
      });
    });

    it('should check journey status even if API returns error', async () => {
      const journeyId = 'journey-123';
      const journeyKey = 'journey-key-123';
      
      const existingJourney = {
        id: journeyId,
        key: journeyKey,
        name: 'Test Journey',
        status: 'Draft',
      };
      
      const publishedJourney = {
        ...existingJourney,
        status: 'Published',
      };
      
      // Setup stubs
      (journeyAware.getJourneyById as SinonStub).resolves(existingJourney);
      (journeyAware.getJourneyByKey as SinonStub).resolves(publishedJourney);
      
      // API returns error but journey is actually activated
      clientStub.post.resolves({
        statusCode: 404,
        body: {
          message: 'Not found',
        },
      });

      const result = await journeyAware.activateJourney(journeyId);

      // Should succeed because getJourneyByKey shows Published status
      expect(result).to.deep.equal(publishedJourney);
    });

    it('should throw an error if journey not found', async () => {
      const journeyId = 'journey-123';
      
      // Setup stubs
      (journeyAware.getJourneyById as SinonStub).resolves(null);
      (journeyAware.getJourneyByKey as SinonStub).resolves(null);
      
      try {
        await journeyAware.activateJourney(journeyId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal(`Journey with ID/key ${journeyId} not found`);
      }
    });
  });

  describe('addContactToJourney', () => {
    it('should call post with expected parameters', async () => {
      const journeyKey = 'journey-key-123';
      const contactKey = 'contact-123';
      const contactData = {
        FirstName: 'John',
        LastName: 'Doe',
      };
      
      clientStub.post.resolves({
        statusCode: 200,
        body: {
          success: true,
        },
      });

      const result = await journeyAware.addContactToJourney(journeyKey, contactKey, contactData);

      // Check that post was called with the correct parameters
      const postCall = clientStub.post.getCall(0);
      const postArgs = postCall.args[0];
      
      expect(postArgs.uri).to.equal('interaction/v1/events');
      expect(postArgs.qs).to.deep.equal({ eventDefinitionKey: journeyKey });
      
      // Parse the body to check the content
      const parsedBody = JSON.parse(postArgs.body);
      expect(parsedBody.ContactKey).to.equal(contactKey);
      expect(parsedBody.FirstName).to.equal('John');
      expect(parsedBody.LastName).to.equal('Doe');
      
      expect(result).to.deep.equal({ success: true });
    });

    it('should handle minimal parameters', async () => {
      const journeyKey = 'journey-key-123';
      const contactKey = 'contact-123';
      
      clientStub.post.resolves({
        statusCode: 200,
        body: {
          success: true,
        },
      });

      const result = await journeyAware.addContactToJourney(journeyKey, contactKey);

      // Check that post was called with the correct parameters
      const postCall = clientStub.post.getCall(0);
      const postArgs = postCall.args[0];
      
      // Parse the body to check the content
      const parsedBody = JSON.parse(postArgs.body);
      expect(parsedBody.ContactKey).to.equal(contactKey);
      // Should only have ContactKey, no other properties
      expect(Object.keys(parsedBody).length).to.equal(1);
    });

    it('should throw an error if API returns error', async () => {
      const journeyKey = 'journey-key-123';
      const contactKey = 'contact-123';
      
      clientStub.post.resolves({
        statusCode: 400,
        body: {
          message: 'Bad request',
        },
      });

      try {
        await journeyAware.addContactToJourney(journeyKey, contactKey);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Adding contact to journey failed with status 400');
      }
    });
  });

  describe('isContactInJourney', () => {
    it('should call post with expected parameters', async () => {
      const contactKey = 'contact-123';
      const journeyId = 'journey-key-123';
      
      clientStub.post.resolves({
        statusCode: 200,
        body: {
          results: {
            contactMemberships: [
              {
                definitionKey: journeyId,
                version: 1,
                status: 'Active',
              },
            ],
          },
        },
      });

      const result = await journeyAware.isContactInJourney(contactKey, journeyId);

      // Check that post was called with the correct parameters
      const postCall = clientStub.post.getCall(0);
      const postArgs = postCall.args[0];
      
      expect(postArgs.uri).to.equal('interaction/v1/interactions/contactMembership');
      
      // Parse the body to check the content
      const parsedBody = JSON.parse(postArgs.body);
      expect(parsedBody.ContactKeyList).to.deep.equal([contactKey]);
      
      expect(result).to.be.true;
    });

    it('should return false if contact is not in the specified journey', async () => {
      const contactKey = 'contact-123';
      const journeyId = 'journey-key-123';
      
      clientStub.post.resolves({
        statusCode: 200,
        body: {
          results: {
            contactMemberships: [
              {
                definitionKey: 'different-journey-key',
                version: 1,
                status: 'Active',
              },
            ],
          },
        },
      });

      const result = await journeyAware.isContactInJourney(contactKey, journeyId);
      expect(result).to.be.false;
    });

    it('should return true if contact is in any journey when journeyId not specified', async () => {
      const contactKey = 'contact-123';
      
      clientStub.post.resolves({
        statusCode: 200,
        body: {
          results: {
            contactMemberships: [
              {
                definitionKey: 'some-journey-key',
                version: 1,
                status: 'Active',
              },
            ],
          },
        },
      });

      const result = await journeyAware.isContactInJourney(contactKey);
      expect(result).to.be.true;
    });

    it('should throw an error if API returns error', async () => {
      const contactKey = 'contact-123';
      
      clientStub.post.resolves({
        statusCode: 400,
        body: {
          message: 'Bad request',
        },
      });

      try {
        await journeyAware.isContactInJourney(contactKey);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Contact in journey check failed with status 400');
      }
    });
  });
}); 