import { expect } from 'chai';
import * as sinon from 'sinon';
import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/list/remove-contact-from-list';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';

describe('RemoveContactFromList', () => {
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    clientWrapperStub = {
      getListById: sinon.stub(),
      getContactByKey: sinon.stub(),
      removeContactFromList: sinon.stub(),
    };
    stepUnderTest = new Step(clientWrapperStub);
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('RemoveContactFromList');
    expect(stepDef.getName()).to.equal('Remove a contact from a SFMC list');
    expect(stepDef.getExpression()).to.equal('remove the salesforce marketing cloud contact with key (?<contactKey>.+) from list with id (?<listId>.+)');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should respond with fail if list is not found', async () => {
    const listId = '123';
    const contactKey = 'contact123';
    protoStep.setData(Struct.fromJavaScript({ listId, contactKey }));
    clientWrapperStub.getListById.resolves(null);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    expect(response.getMessageFormat()).to.equal('No list found with ID %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(listId);
  });

  it('should respond with fail if contact is not found', async () => {
    const listId = '123';
    const contactKey = 'contact123';
    const list = { id: listId, name: 'Test List' };
    protoStep.setData(Struct.fromJavaScript({ listId, contactKey }));
    clientWrapperStub.getListById.resolves(list);
    clientWrapperStub.getContactByKey.resolves(null);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    expect(response.getMessageFormat()).to.equal('No contact found with key %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(contactKey);
  });

  it('should respond with fail if removing contact fails', async () => {
    const listId = '123';
    const contactKey = 'contact123';
    const list = { id: listId, name: 'Test List' };
    const contact = { contactKey };
    protoStep.setData(Struct.fromJavaScript({ listId, contactKey }));
    clientWrapperStub.getListById.resolves(list);
    clientWrapperStub.getContactByKey.resolves(contact);
    clientWrapperStub.removeContactFromList.resolves(false);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    expect(response.getMessageFormat()).to.equal('Failed to remove contact %s from list %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(contactKey);
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal(listId);
  });

  it('should respond with error if API returns error', async () => {
    const listId = '123';
    const contactKey = 'contact123';
    const list = { id: listId, name: 'Test List' };
    const contact = { contactKey };
    const expectedError = new Error('API error');
    protoStep.setData(Struct.fromJavaScript({ listId, contactKey }));
    clientWrapperStub.getListById.resolves(list);
    clientWrapperStub.getContactByKey.resolves(contact);
    clientWrapperStub.removeContactFromList.rejects(expectedError);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('There was an error removing contact from list: %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(expectedError.message);

    // Verify error record
    const records = response.getRecordsList();
    expect(records).to.have.length(2); // One regular record and one ordered record
    const record = records[0];
    expect(record).to.not.be.undefined;
    expect(record.getId()).to.equal('removedContact');
    expect(record.getName()).to.equal('Contact Removed From List');
    const keyValue = record.getKeyValue()!;
    const recordData = keyValue.toJavaScript();
    expect(recordData.contactKey).to.equal(contactKey);
    expect(recordData.listId).to.equal(listId);
    expect(recordData.success).to.equal(false);
  });

  it('should respond with pass if contact is removed successfully', async () => {
    const listId = '123';
    const contactKey = 'contact123';
    const list = { id: listId, name: 'Test List' };
    const contact = { contactKey };
    protoStep.setData(Struct.fromJavaScript({ listId, contactKey }));
    clientWrapperStub.getListById.resolves(list);
    clientWrapperStub.getContactByKey.resolves(contact);
    clientWrapperStub.removeContactFromList.resolves(true);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(response.getMessageFormat()).to.equal('Successfully removed contact %s from list %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(contactKey);
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal(list.name);

    // Verify success record
    const records = response.getRecordsList();
    expect(records).to.have.length(2); // One regular record and one ordered record
    const record = records[0];
    expect(record).to.not.be.undefined;
    expect(record.getId()).to.equal('removedContact');
    expect(record.getName()).to.equal('Contact Removed From List');
    const keyValue = record.getKeyValue()!;
    const recordData = keyValue.toJavaScript();
    expect(recordData.contactKey).to.equal(contactKey);
    expect(recordData.listId).to.equal(listId);
    expect(recordData.success).to.equal(true);
  });
}); 