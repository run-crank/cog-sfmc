import { expect } from 'chai';
import * as sinon from 'sinon';
import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/list/delete-list';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';

describe('DeleteList', () => {
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    clientWrapperStub = {
      getListById: sinon.stub(),
      deleteList: sinon.stub(),
    };
    stepUnderTest = new Step(clientWrapperStub);
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('DeleteList');
    expect(stepDef.getName()).to.equal('Delete a SFMC list');
    expect(stepDef.getExpression()).to.equal('delete the salesforce marketing cloud list with id (?<listId>.+)');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should respond with fail if list is not found', async () => {
    const listId = '123';
    protoStep.setData(Struct.fromJavaScript({ listId }));
    clientWrapperStub.getListById.resolves(null);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    expect(response.getMessageFormat()).to.equal('No list found with ID %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(listId);
  });

  it('should respond with fail if deletion fails', async () => {
    const listId = '123';
    const existingList = { id: listId, name: 'Test List' };
    protoStep.setData(Struct.fromJavaScript({ listId }));
    clientWrapperStub.getListById.resolves(existingList);
    clientWrapperStub.deleteList.resolves(false);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    expect(response.getMessageFormat()).to.equal('Failed to delete list with ID %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(listId);
  });

  it('should respond with error if API returns error', async () => {
    const listId = '123';
    const existingList = { id: listId, name: 'Test List' };
    const expectedError = new Error('API error');
    protoStep.setData(Struct.fromJavaScript({ listId }));
    clientWrapperStub.getListById.resolves(existingList);
    clientWrapperStub.deleteList.rejects(expectedError);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('There was an error deleting the list: %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(expectedError.message);
  });

  it('should respond with pass if list is deleted successfully', async () => {
    const listId = '123';
    const existingList = {
      id: listId,
      name: 'Test List',
      status: 'Active',
    };
    protoStep.setData(Struct.fromJavaScript({ listId }));
    clientWrapperStub.getListById.resolves(existingList);
    clientWrapperStub.deleteList.resolves(true);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(response.getMessageFormat()).to.equal('Successfully deleted SFMC list %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(existingList.name);

    // Verify the deleted record
    const records = response.getRecordsList();
    expect(records).to.have.length(2); // One regular record and one ordered record
    const record = records[0];
    expect(record).to.not.be.undefined;
    expect(record.getId()).to.equal('list');
    expect(record.getName()).to.equal('Deleted List');
    const keyValue = record.getKeyValue()!;
    const recordData = keyValue.toJavaScript();
    expect(recordData.id).to.equal(existingList.id);
    expect(recordData.name).to.equal(existingList.name);
  });
}); 