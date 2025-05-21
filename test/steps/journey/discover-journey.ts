import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RecordDefinition, StepRecord } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/journey/discover-journey';

chai.use(sinonChai);

describe('DiscoverJourney', () => {
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
    expect(stepDef.getStepId()).to.equal('DiscoverJourney');
    expect(stepDef.getName()).to.equal('Discover a Salesforce Marketing Cloud journey');
    expect(stepDef.getExpression()).to.equal('discover a salesforce marketing cloud journey with id (?<idOrKey>[a-zA-Z0-9_-]+)');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // idOrKey field
    const idOrKey: any = fields.filter(f => f.key === 'idOrKey')[0];
    expect(idOrKey.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(idOrKey.type).to.equal(FieldDefinition.Type.STRING);

    // extras field
    const extras: any = fields.filter(f => f.key === 'extras')[0];
    expect(extras.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(extras.type).to.equal(FieldDefinition.Type.STRING);
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
  });

  it('should respond with pass if journey is discovered by ID', async () => {
    const idOrKey = 'journey-123';
    const expectedJourney = {
      id: idOrKey,
      key: 'journey-key-123',
      name: 'Test Journey',
      status: 'Draft',
      description: 'A test journey',
    };
    apiClientStub.getJourneyById.resolves(expectedJourney);
    apiClientStub.getJourneyByKey.resolves(null);

    protoStep.setData(Struct.fromJavaScript({
      idOrKey,
      extras: '',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    
    // Check the number of records returned (should be 2 - one regular and one ordered)
    const records = response.getRecordsList();
    expect(records.length).to.equal(2);
    
    // Verify the first record (journey)
    expect(records[0].getId()).to.equal('exposeOnPass:journey');
    
    // Safe access the record data
    const keyValue1 = records[0].getKeyValue();
    expect(keyValue1).to.not.be.undefined;
    if (keyValue1) {
      const record1Data = keyValue1.toJavaScript();
      expect(record1Data.id).to.equal(expectedJourney.id);
      expect(record1Data.key).to.equal(expectedJourney.key);
      expect(record1Data.name).to.equal(expectedJourney.name);
      expect(record1Data.status).to.equal(expectedJourney.status);
    }
    
    // Verify the second record (journey.1)
    expect(records[1].getId()).to.equal('journey.1');
  });

  it('should respond with pass if journey is discovered by key', async () => {
    const idOrKey = 'journey-key-123';
    const expectedJourney = {
      id: 'journey-123',
      key: idOrKey,
      name: 'Test Journey',
      status: 'Draft',
      description: 'A test journey',
    };
    apiClientStub.getJourneyById.resolves(null);
    apiClientStub.getJourneyByKey.resolves(expectedJourney);

    protoStep.setData(Struct.fromJavaScript({
      idOrKey,
      extras: '',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    
    // Verify the journey was first looked up by ID, then by key
    expect(apiClientStub.getJourneyById).to.have.been.calledWith(idOrKey, '');
    expect(apiClientStub.getJourneyByKey).to.have.been.calledWith(idOrKey, '');
    
    // Check the record data
    const keyValue = response.getRecordsList()[0].getKeyValue();
    expect(keyValue).to.not.be.undefined;
    if (keyValue) {
      const recordData = keyValue.toJavaScript();
      expect(recordData.id).to.equal(expectedJourney.id);
      expect(recordData.key).to.equal(expectedJourney.key);
    }
  });

  it('should handle extras parameter', async () => {
    const idOrKey = 'journey-123';
    const extras = 'all';
    const expectedJourney = {
      id: idOrKey,
      key: 'journey-key-123',
      name: 'Test Journey',
      status: 'Draft',
    };
    apiClientStub.getJourneyById.resolves(expectedJourney);

    protoStep.setData(Struct.fromJavaScript({
      idOrKey,
      extras,
    }));

    await stepUnderTest.executeStep(protoStep);
    
    // Verify extras were passed to the client method
    expect(apiClientStub.getJourneyById).to.have.been.calledWith(idOrKey, extras);
  });

  it('should respond with fail if journey is not found', async () => {
    const idOrKey = 'journey-123';
    apiClientStub.getJourneyById.resolves(null);
    apiClientStub.getJourneyByKey.resolves(null);

    protoStep.setData(Struct.fromJavaScript({
      idOrKey,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    expect(response.getMessageFormat()).to.equal('Journey with ID or Key %s not found');
  });

  it('should respond with error if API client throws error', async () => {
    const idOrKey = 'journey-123';
    apiClientStub.getJourneyById.throws(new Error('API Error'));

    protoStep.setData(Struct.fromJavaScript({
      idOrKey,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('There was a problem discovering the journey: %s');
  });
}); 