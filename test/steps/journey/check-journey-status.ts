import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RecordDefinition, StepRecord } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/journey/check-journey-status';

chai.use(sinonChai);

describe('CheckJourneyStatus', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let apiClientStub: any;

  beforeEach(() => {
    apiClientStub = sinon.stub();
    apiClientStub.getJourneyById = sinon.stub();
    apiClientStub.getJourneyByKey = sinon.stub();
    stepUnderTest = new Step(apiClientStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CheckJourneyStatus');
    expect(stepDef.getName()).to.equal('Check a Salesforce Marketing Cloud journey status');
    expect(stepDef.getExpression()).to.equal('the salesforce marketing cloud journey with id (?<journeyId>[a-zA-Z0-9_-]+) should have status (?<expectedStatus>.+)');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // journeyId field
    const journeyId: any = fields.filter(f => f.key === 'journeyId')[0];
    expect(journeyId.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(journeyId.type).to.equal(FieldDefinition.Type.STRING);

    // expectedStatus field
    const expectedStatus: any = fields.filter(f => f.key === 'expectedStatus')[0];
    expect(expectedStatus.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(expectedStatus.type).to.equal(FieldDefinition.Type.STRING);
  });

  it('should return expected step records', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const records: any[] = stepDef.getExpectedRecordsList().map((record: RecordDefinition) => {
      return record.toObject();
    });

    // Journey record
    const journey: any = records.filter(r => r.id === 'journey')[0];
    expect(journey.type).to.equal(RecordDefinition.Type.KEYVALUE);
    expect(journey.mayHaveMoreFields).to.equal(true);

    // Status field
    const status = journey.guaranteedFieldsList.filter(f => f.key === 'status')[0];
    expect(status.type).to.equal(FieldDefinition.Type.STRING);
  });

  it('should respond with pass if journey has expected status (by ID)', async () => {
    const journeyId = 'journey-123';
    const expectedStatus = 'Published';
    const journey = {
      id: journeyId,
      key: 'journey-key-123',
      name: 'Test Journey',
      status: expectedStatus,
    };

    // Setup stubs
    apiClientStub.getJourneyById.resolves(journey);
    apiClientStub.getJourneyByKey.resolves(null);

    protoStep.setData(Struct.fromJavaScript({
      journeyId,
      expectedStatus,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);

    // Verify client method was called with expected arguments
    expect(apiClientStub.getJourneyById).to.have.been.calledWith(journeyId);

    // Check message format and args
    expect(response.getMessageFormat()).to.equal('Journey %s has expected status %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(journeyId);
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal(expectedStatus);

    // Verify the record data
    const record = response.getRecordsList()[0];
    expect(record.getId()).to.equal('journey');

    const keyValue = record.getKeyValue();
    expect(keyValue).to.not.be.undefined;
    if (keyValue) {
      const recordData = keyValue.toJavaScript();
      expect(recordData.id).to.equal(journey.id);
      expect(recordData.key).to.equal(journey.key);
      expect(recordData.name).to.equal(journey.name);
      expect(recordData.status).to.equal(expectedStatus);
    }
  });

  it('should respond with pass if journey has expected status (by key)', async () => {
    const journeyKey = 'journey-key-123';
    const expectedStatus = 'Published';
    const journey = {
      id: 'journey-123',
      key: journeyKey,
      name: 'Test Journey',
      status: expectedStatus,
    };

    // Setup stubs
    apiClientStub.getJourneyById.resolves(null);
    apiClientStub.getJourneyByKey.resolves(journey);

    protoStep.setData(Struct.fromJavaScript({
      journeyId: journeyKey,
      expectedStatus,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);

    // Verify client methods were called with expected arguments
    expect(apiClientStub.getJourneyById).to.have.been.calledWith(journeyKey);
    expect(apiClientStub.getJourneyByKey).to.have.been.calledWith(journeyKey);

    // Check message format and args
    expect(response.getMessageFormat()).to.equal('Journey %s has expected status %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(journeyKey);
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal(expectedStatus);
  });

  it('should respond with fail if journey has unexpected status', async () => {
    const journeyId = 'journey-123';
    const expectedStatus = 'Published';
    const actualStatus = 'Draft';
    const journey = {
      id: journeyId,
      key: 'journey-key-123',
      name: 'Test Journey',
      status: actualStatus,
    };

    // Setup stubs
    apiClientStub.getJourneyById.resolves(journey);

    protoStep.setData(Struct.fromJavaScript({
      journeyId,
      expectedStatus,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);

    // Check message format and args
    expect(response.getMessageFormat()).to.equal('Expected journey %s to have status %s, but got %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(journeyId);
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal(expectedStatus);
    expect(response.getMessageArgsList()[2].getStringValue()).to.equal(actualStatus);

    // Verify the record data
    const record = response.getRecordsList()[0];
    expect(record.getId()).to.equal('journey');

    const keyValue = record.getKeyValue();
    expect(keyValue).to.not.be.undefined;
    if (keyValue) {
      const recordData = keyValue.toJavaScript();
      expect(recordData.status).to.equal(actualStatus);
    }
  });

  it('should respond with fail if journey is not found', async () => {
    const journeyId = 'journey-123';
    const expectedStatus = 'Published';
    
    // Setup stubs
    apiClientStub.getJourneyById.resolves(null);
    apiClientStub.getJourneyByKey.resolves(null);

    protoStep.setData(Struct.fromJavaScript({
      journeyId,
      expectedStatus,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    
    // Check message format and args
    expect(response.getMessageFormat()).to.equal('Journey %s not found');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(journeyId);
  });

  it('should respond with error if an exception is thrown', async () => {
    const journeyId = 'journey-123';
    const expectedStatus = 'Published';

    // Setup stubs
    apiClientStub.getJourneyById.throws(new Error('API Error'));

    protoStep.setData(Struct.fromJavaScript({
      journeyId,
      expectedStatus,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);

    // Check message format
    expect(response.getMessageFormat()).to.equal('There was a problem checking the journey status: %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.include('API Error');
  });
});
