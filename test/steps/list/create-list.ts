import { expect } from 'chai';
import * as sinon from 'sinon';
import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/list/create-list';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';

describe('CreateList', () => {
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    clientWrapperStub = {
      createList: sinon.stub(),
    };
    stepUnderTest = new Step(clientWrapperStub);
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CreateList');
    expect(stepDef.getName()).to.equal('Create a SFMC list');
    expect(stepDef.getExpression()).to.equal('create a salesforce marketing cloud list');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should respond with error if list data is missing required fields', async () => {
    const list = {};
    protoStep.setData(Struct.fromJavaScript({ list }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('The name field is required to create a list');
  });

  it('should respond with error if API returns error', async () => {
    const list = { name: 'Test List' };
    const expectedError = new Error('API error');
    protoStep.setData(Struct.fromJavaScript({ list }));
    clientWrapperStub.createList.rejects(expectedError);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('There was an error creating the list: %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(expectedError.message);
  });

  it('should respond with error if API returns error object', async () => {
    const list = { name: 'Test List' };
    const errorResponse = { errorcode: 'ERROR_CODE', message: 'Error message' };
    protoStep.setData(Struct.fromJavaScript({ list }));
    clientWrapperStub.createList.resolves(errorResponse);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('API returned error: %s - %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(errorResponse.errorcode);
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal(errorResponse.message);
  });

  it('should respond with error if API response is missing required fields', async () => {
    const list = { name: 'Test List' };
    protoStep.setData(Struct.fromJavaScript({ list }));
    clientWrapperStub.createList.resolves({ status: 'Active' }); // Missing id and name

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('Invalid response from API: missing required fields');
  });

  it('should respond with pass if list is created successfully', async () => {
    const list = { name: 'Test List', description: 'Test Description' };
    const createdList = {
      id: '123',
      name: 'Test List',
      description: 'Test Description',
      status: 'Active',
    };
    protoStep.setData(Struct.fromJavaScript({ list }));
    clientWrapperStub.createList.resolves(createdList);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(response.getMessageFormat()).to.equal('Successfully created SFMC list %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(createdList.name);

    // Verify the created record
    const records = response.getRecordsList();
    expect(records).to.have.length(2); // One regular record and one ordered record
    const record = records[0];
    expect(record).to.not.be.undefined;
    expect(record.getId()).to.equal('list');
    expect(record.getName()).to.equal('Created List');
    const keyValue = record.getKeyValue()!;
    const recordData = keyValue.toJavaScript();
    expect(recordData.id).to.equal(createdList.id);
    expect(recordData.name).to.equal(createdList.name);
    expect(recordData.status).to.equal(createdList.status);
  });

  it('should handle warnings in API response', async () => {
    const list = { name: 'Test List' };
    const createdList = {
      id: '123',
      name: 'Test List',
      status: 'Active',
      warnings: ['Warning message'],
    };
    protoStep.setData(Struct.fromJavaScript({ list }));
    clientWrapperStub.createList.resolves(createdList);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(response.getMessageFormat()).to.equal('Successfully created SFMC list %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(createdList.name);
  });
}); 