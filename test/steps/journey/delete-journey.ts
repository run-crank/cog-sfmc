import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RecordDefinition, StepRecord } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/journey/delete-journey';

chai.use(sinonChai);

describe('DeleteJourney', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let apiClientStub: any;

  beforeEach(() => {
    apiClientStub = sinon.stub();
    apiClientStub.getJourneyById = sinon.stub();
    apiClientStub.getJourneyByKey = sinon.stub();
    apiClientStub.deleteJourney = sinon.stub();
    stepUnderTest = new Step(apiClientStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('DeleteJourney');
    expect(stepDef.getName()).to.equal('Delete a Salesforce Marketing Cloud journey');
    expect(stepDef.getExpression()).to.equal('delete the salesforce marketing cloud journey with id (?<id>[a-zA-Z0-9_-]+)');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // id field
    const id: any = fields.filter(f => f.key === 'id')[0];
    expect(id.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(id.type).to.equal(FieldDefinition.Type.STRING);
  });

  it('should respond with pass if journey is deleted successfully by ID', async () => {
    const journeyId = 'journey-123';
    const journey = {
      id: journeyId,
      key: 'journey-key-123',
      name: 'Test Journey',
      status: 'Draft',
    };

    // Setup stubs
    apiClientStub.getJourneyById.resolves(journey);
    apiClientStub.getJourneyByKey.resolves(null);
    apiClientStub.deleteJourney.resolves(true);

    protoStep.setData(Struct.fromJavaScript({
      id: journeyId,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);

    // Verify client methods were called with expected arguments
    expect(apiClientStub.getJourneyById).to.have.been.calledWith(journeyId);
    expect(apiClientStub.deleteJourney).to.have.been.calledWith(journeyId);

    // Check message format and args
    expect(response.getMessageFormat()).to.equal('Successfully deleted journey %s (ID: %s)');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(journey.name);
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal(journey.id);
  });

  it('should respond with pass if journey is deleted successfully by key', async () => {
    const journeyKey = 'journey-key-123';
    const journey = {
      id: 'journey-123',
      key: journeyKey,
      name: 'Test Journey',
      status: 'Draft',
    };

    // Setup stubs
    apiClientStub.getJourneyById.resolves(null);
    apiClientStub.getJourneyByKey.resolves(journey);
    apiClientStub.deleteJourney.resolves(true);

    protoStep.setData(Struct.fromJavaScript({
      id: journeyKey,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);

    // Verify client methods were called with expected arguments
    expect(apiClientStub.getJourneyById).to.have.been.calledWith(journeyKey);
    expect(apiClientStub.getJourneyByKey).to.have.been.calledWith(journeyKey);
    expect(apiClientStub.deleteJourney).to.have.been.calledWith(journey.id);

    // Check message format and args
    expect(response.getMessageFormat()).to.equal('Successfully deleted journey %s (ID: %s)');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(journey.name);
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal(journey.id);
  });

  it('should respond with fail if journey is not found', async () => {
    const journeyId = 'journey-123';

    // Setup stubs
    apiClientStub.getJourneyById.resolves(null);
    apiClientStub.getJourneyByKey.resolves(null);

    protoStep.setData(Struct.fromJavaScript({
      id: journeyId,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);

    // Check message format and args
    expect(response.getMessageFormat()).to.equal('Journey %s not found');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(journeyId);
  });

  it('should respond with fail if deletion returns false', async () => {
    const journeyId = 'journey-123';
    const journey = {
      id: journeyId,
      key: 'journey-key-123',
      name: 'Test Journey',
      status: 'Draft',
    };

    // Setup stubs
    apiClientStub.getJourneyById.resolves(journey);
    apiClientStub.deleteJourney.resolves(false);

    protoStep.setData(Struct.fromJavaScript({
      id: journeyId,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);

    // Check message format and args
    expect(response.getMessageFormat()).to.equal('Failed to delete journey %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(journeyId);
  });

  it('should respond with error if an exception is thrown', async () => {
    const journeyId = 'journey-123';

    // Setup stubs
    apiClientStub.getJourneyById.throws(new Error('API Error'));

    protoStep.setData(Struct.fromJavaScript({
      id: journeyId,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);

    // Check message format
    expect(response.getMessageFormat()).to.equal('There was a problem deleting the journey: %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.include('API Error');
  });
});
