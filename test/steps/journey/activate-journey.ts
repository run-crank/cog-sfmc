import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RecordDefinition, StepRecord } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/journey/activate-journey';

chai.use(sinonChai);

describe('ActivateJourney', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let apiClientStub: any;
  let setTimeoutStub: sinon.SinonStub;

  beforeEach(() => {
    apiClientStub = sinon.stub();
    apiClientStub.getJourneyById = sinon.stub();
    apiClientStub.getJourneyByKey = sinon.stub();
    apiClientStub.activateJourney = sinon.stub();
    stepUnderTest = new Step(apiClientStub);
    protoStep = new ProtoStep();
    
    // Mock setTimeout to make it return immediately
    setTimeoutStub = sinon.stub(global, 'setTimeout').callsFake((callback: Function) => {
      if (typeof callback === 'function') callback();
      return 1 as any; // Return a number as NodeJS.Timeout
    });
  });

  afterEach(() => {
    setTimeoutStub.restore();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('ActivateJourney');
    expect(stepDef.getName()).to.equal('Activate a Salesforce Marketing Cloud journey');
    expect(stepDef.getExpression()).to.equal('activate the salesforce marketing cloud journey with id (?<id>[a-zA-Z0-9_-]+)');
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

  it('should respond with pass if journey is activated successfully', async () => {
    const journeyId = 'journey-123';
    const existingJourney = {
      id: journeyId,
      key: 'journey-key-123',
      name: 'Test Journey',
      status: 'Draft',
    };
    
    const updatedJourney = {
      ...existingJourney,
      status: 'Published',
    };
    
    // Setup stubs
    apiClientStub.getJourneyById.resolves(existingJourney);
    apiClientStub.activateJourney.resolves();
    apiClientStub.getJourneyByKey.resolves(updatedJourney);

    protoStep.setData(Struct.fromJavaScript({
      id: journeyId,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    
    // Verify client methods were called with expected arguments
    expect(apiClientStub.getJourneyById).to.have.been.calledWith(journeyId);
    expect(apiClientStub.activateJourney).to.have.been.calledWith(journeyId);
    expect(apiClientStub.getJourneyByKey).to.have.been.calledWith(existingJourney.key);
    
    // Check message format and args
    expect(response.getMessageFormat()).to.equal('Successfully activated journey %s (ID: %s)');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(existingJourney.name);
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal(existingJourney.id);
    
    // Verify the record data
    const record = response.getRecordsList()[0];
    expect(record.getId()).to.equal('journey');
    
    const keyValue = record.getKeyValue();
    expect(keyValue).to.not.be.undefined;
    if (keyValue) {
      const recordData = keyValue.toJavaScript();
      expect(recordData.id).to.equal(updatedJourney.id);
      expect(recordData.key).to.equal(updatedJourney.key);
      expect(recordData.status).to.equal('Published');
    }
  });

  it('should respond with fail if journey is not published after activation', async () => {
    const journeyId = 'journey-123';
    const existingJourney = {
      id: journeyId,
      key: 'journey-key-123',
      name: 'Test Journey',
      status: 'Draft',
    };
    
    // Journey status remains Draft (activation failed)
    const updatedJourney = {
      ...existingJourney,
      status: 'Draft',
    };
    
    // Setup stubs
    apiClientStub.getJourneyById.resolves(existingJourney);
    apiClientStub.activateJourney.resolves();
    apiClientStub.getJourneyByKey.resolves(updatedJourney);

    protoStep.setData(Struct.fromJavaScript({
      id: journeyId,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    
    // Check message format and args
    expect(response.getMessageFormat()).to.equal('Journey %s could not be activated. Current status: %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(existingJourney.name);
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal('Draft');
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

  it('should respond with fail if journey is not found after activation attempt', async () => {
    const journeyId = 'journey-123';
    const existingJourney = {
      id: journeyId,
      key: 'journey-key-123',
      name: 'Test Journey',
      status: 'Draft',
    };
    
    // Setup stubs
    apiClientStub.getJourneyById.resolves(existingJourney);
    apiClientStub.activateJourney.resolves();
    apiClientStub.getJourneyByKey.resolves(null);

    protoStep.setData(Struct.fromJavaScript({
      id: journeyId,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    
    // Check message format and args
    expect(response.getMessageFormat()).to.equal('Journey %s not found after activation attempt');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(journeyId);
  });

  it('should handle activation errors and still try to check status', async () => {
    const journeyId = 'journey-123';
    const existingJourney = {
      id: journeyId,
      key: 'journey-key-123',
      name: 'Test Journey',
      status: 'Draft',
    };
    
    const updatedJourney = {
      ...existingJourney,
      status: 'Published',
    };
    
    // Setup stubs
    apiClientStub.getJourneyById.resolves(existingJourney);
    apiClientStub.activateJourney.throws(new Error('Activation failed'));
    apiClientStub.getJourneyByKey.resolves(updatedJourney);

    // Mock console.error to prevent test output pollution
    const consoleErrorStub = sinon.stub(console, 'error');

    protoStep.setData(Struct.fromJavaScript({
      id: journeyId,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    
    // Activation error should have been logged
    expect(consoleErrorStub).to.have.been.calledWith('Activation error:', sinon.match.instanceOf(Error));
    
    // But we still check status and it shows as Published, so it passes
    expect(response.getMessageFormat()).to.equal('Successfully activated journey %s (ID: %s)');

    // Restore console.error
    consoleErrorStub.restore();
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
    expect(response.getMessageFormat()).to.equal('There was a problem activating the journey: %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.contain('API Error');
  });
});
