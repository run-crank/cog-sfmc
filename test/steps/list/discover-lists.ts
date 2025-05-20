import { expect } from 'chai';
import * as sinon from 'sinon';
import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/list/discover-lists';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';

describe('DiscoverLists', () => {
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    clientWrapperStub = {
      getAllLists: sinon.stub(),
    };
    stepUnderTest = new Step(clientWrapperStub);
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('DiscoverLists');
    expect(stepDef.getName()).to.equal('Discover Salesforce Marketing Cloud lists');
    expect(stepDef.getExpression()).to.equal('discover salesforce marketing cloud lists');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should respond with success if lists are found', async () => {
    const expectedLists = [
      { id: '1', name: 'List 1', description: 'First list', status: 'Active' },
      { id: '2', name: 'List 2', description: 'Second list', status: 'Active' },
    ];
    clientWrapperStub.getAllLists.resolves(expectedLists);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(response.getMessageFormat()).to.equal('Successfully discovered %d SFMC lists');
    // expect(response.getMessageArgsList()[0].getStringValue()).to.equal(String(expectedLists.length));
  });

  it('should respond with fail if no lists are found', async () => {
    clientWrapperStub.getAllLists.resolves([]);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    expect(response.getMessageFormat()).to.equal('No lists found in the account');
  });

  it('should respond with error if API returns error', async () => {
    const expectedError = new Error('API error');
    clientWrapperStub.getAllLists.rejects(expectedError);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('There was an error discovering lists: %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(expectedError.message);
  });

  it('should pass filters to API when provided', async () => {
    const filters = { status: 'Active' };
    protoStep.setData(Struct.fromJavaScript({ filters }));
    clientWrapperStub.getAllLists.resolves([{ id: '1', name: 'List 1' }]);

    await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.getAllLists).to.have.been.calledWith(filters);
  });
}); 