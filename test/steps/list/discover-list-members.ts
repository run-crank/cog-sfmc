import { expect } from 'chai';
import * as sinon from 'sinon';
import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/list/discover-list-members';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';

describe('DiscoverListMembers', () => {
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    clientWrapperStub = {
      getListById: sinon.stub(),
      getListMembers: sinon.stub(),
    };
    stepUnderTest = new Step(clientWrapperStub);
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('DiscoverListMembers');
    expect(stepDef.getName()).to.equal('Discover Salesforce Marketing Cloud list members');
    expect(stepDef.getExpression()).to.equal('discover members of salesforce marketing cloud list with id (?<listId>.+)');
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

  it('should respond with pass if list exists but has no members', async () => {
    const listId = '123';
    const list = { id: listId, name: 'Test List' };
    protoStep.setData(Struct.fromJavaScript({ listId }));
    clientWrapperStub.getListById.resolves(list);
    clientWrapperStub.getListMembers.resolves([]);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(response.getMessageFormat()).to.equal('No members found in list %s (%s)');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(list.name);
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal(listId);
  });

  it('should respond with pass and members if list has members', async () => {
    const listId = '123';
    const list = { id: listId, name: 'Test List' };
    const members = [
      { contactKey: 'key1', status: 'Active', createdDate: '2023-01-01', modifiedDate: '2023-01-02' },
      { contactKey: 'key2', status: 'Active', createdDate: '2023-01-01', modifiedDate: '2023-01-02' },
    ];
    protoStep.setData(Struct.fromJavaScript({ listId }));
    clientWrapperStub.getListById.resolves(list);
    clientWrapperStub.getListMembers.resolves(members);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(response.getMessageFormat()).to.equal('Successfully discovered %d members in SFMC list %s');
    // expect(response.getMessageArgsList()[0].getStringValue()).to.equal(String(members.length));
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal(list.name);
  });

  it('should respond with error if API returns error', async () => {
    const listId = '123';
    const expectedError = new Error('API error');
    protoStep.setData(Struct.fromJavaScript({ listId }));
    clientWrapperStub.getListById.rejects(expectedError);

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('There was an error discovering list members: %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(expectedError.message);
  });

  it('should pass pagination options to API when provided', async () => {
    const listId = '123';
    const page = 2;
    const pageSize = 25;
    const filters = { status: 'Active' };
    protoStep.setData(Struct.fromJavaScript({ listId, page, pageSize, filters }));
    clientWrapperStub.getListById.resolves({ id: listId, name: 'Test List' });
    clientWrapperStub.getListMembers.resolves([{ contactKey: 'key1' }]);

    await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.getListMembers).to.have.been.calledWith(listId, { page, pageSize, filters });
  });
}); 