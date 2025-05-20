import { expect } from 'chai';
import * as sinon from 'sinon';
import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/list/update-list';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';

describe('UpdateList', () => {
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    clientWrapperStub = {
      getListById: sinon.stub(),
      updateList: sinon.stub(),
    };
    stepUnderTest = new Step(clientWrapperStub);
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('UpdateList');
    expect(stepDef.getName()).to.equal('Update a SFMC list');
    expect(stepDef.getExpression()).to.equal('update the salesforce marketing cloud list with id (?<listId>.+)');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should respond with fail if list is not found', async () => {
    const listId = '123';
    const list = { name: 'Updated List' };
    protoStep.setData(Struct.fromJavaScript({ listId, list }));
    clientWrapperStub.getListById.resolves(null);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    expect(response.getMessageFormat()).to.equal('No list found with ID %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(listId);
  });

  it('should respond with fail if update fails', async () => {
    const listId = '123';
    const list = { name: 'Updated List' };
    const existingList = { id: listId, name: 'Original List' };
    protoStep.setData(Struct.fromJavaScript({ listId, list }));
    clientWrapperStub.getListById.resolves(existingList);
    clientWrapperStub.updateList.resolves(null);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    expect(response.getMessageFormat()).to.equal('Failed to update list with ID %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(listId);
  });

  it('should respond with error if API returns error', async () => {
    const listId = '123';
    const list = { name: 'Updated List' };
    const existingList = { id: listId, name: 'Original List' };
    const expectedError = new Error('API error');
    protoStep.setData(Struct.fromJavaScript({ listId, list }));
    clientWrapperStub.getListById.resolves(existingList);
    clientWrapperStub.updateList.rejects(expectedError);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('There was an error updating the list: %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(expectedError.message);
  });

  it('should respond with pass if list is updated successfully', async () => {
    const listId = '123';
    const list = { name: 'Updated List', description: 'Updated Description' };
    const existingList = { id: listId, name: 'Original List' };
    const updatedList = {
      id: listId,
      name: 'Updated List',
      description: 'Updated Description',
      status: 'Active',
    };
    protoStep.setData(Struct.fromJavaScript({ listId, list }));
    clientWrapperStub.getListById.resolves(existingList);
    clientWrapperStub.updateList.resolves(updatedList);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(response.getMessageFormat()).to.equal('Successfully updated SFMC list %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(updatedList.name);

    // Verify the updated record
    const records = response.getRecordsList();
    expect(records).to.have.length(2); // One regular record and one ordered record
    const record = records[0];
    expect(record).to.not.be.undefined;
    expect(record.getId()).to.equal('list');
    expect(record.getName()).to.equal('Updated List');
    const keyValue = record.getKeyValue()!;
    const recordData = keyValue.toJavaScript();
    expect(recordData.id).to.equal(updatedList.id);
    expect(recordData.name).to.equal(updatedList.name);
    expect(recordData.status).to.equal(updatedList.status);
  });

  it('should handle warnings in API response', async () => {
    const listId = '123';
    const list = { name: 'Updated List' };
    const existingList = { id: listId, name: 'Original List' };
    const updatedList = {
      id: listId,
      name: 'Updated List',
      status: 'Active',
      warnings: ['Warning message'],
    };
    protoStep.setData(Struct.fromJavaScript({ listId, list }));
    clientWrapperStub.getListById.resolves(existingList);
    clientWrapperStub.updateList.resolves(updatedList);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(response.getMessageFormat()).to.equal('Successfully updated SFMC list %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(updatedList.name);
  });
}); 