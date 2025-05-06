import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RecordDefinition, StepRecord } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/journey/create-journey';

chai.use(sinonChai);

describe('CreateJourney', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let apiClientStub: any;

  beforeEach(() => {
    apiClientStub = sinon.stub();
    apiClientStub.createJourney = sinon.stub();
    stepUnderTest = new Step(apiClientStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CreateJourney');
    expect(stepDef.getName()).to.equal('Create a Salesforce Marketing Cloud journey');
    expect(stepDef.getExpression()).to.equal('create a salesforce marketing cloud journey');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // name field
    const name: any = fields.filter(f => f.key === 'name')[0];
    expect(name.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(name.type).to.equal(FieldDefinition.Type.STRING);

    // description field
    const description: any = fields.filter(f => f.key === 'description')[0];
    expect(description.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(description.type).to.equal(FieldDefinition.Type.STRING);

    // key field
    const key: any = fields.filter(f => f.key === 'key')[0];
    expect(key.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(key.type).to.equal(FieldDefinition.Type.STRING);

    // journey field
    const journey: any = fields.filter(f => f.key === 'journey')[0];
    expect(journey.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(journey.type).to.equal(FieldDefinition.Type.MAP);
  });

  it('should return expected step records', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const records: any[] = stepDef.getExpectedRecordsList().map((record: RecordDefinition) => {
      return record.toObject();
    });

    // Journey record
    const journey: any = records.filter(r => r.id === 'journey')[0];
    expect(journey.type).to.equal(RecordDefinition.Type.KEYVALUE);
    expect(journey.mayHaveMoreFields).to.equal(false);

    // Journey record fields
    const journeyId: any = journey.guaranteedFieldsList.filter(f => f.key === 'id')[0];
    expect(journeyId.type).to.equal(FieldDefinition.Type.STRING);

    const journeyKey: any = journey.guaranteedFieldsList.filter(f => f.key === 'key')[0];
    expect(journeyKey.type).to.equal(FieldDefinition.Type.STRING);
  });

  it('should respond with pass if journey is created successfully', async () => {
    const journeyData = {
      name: 'Test Journey',
      description: 'A test journey',
      key: 'test-journey-key',
      journey: {
        workflowApiVersion: 1.0,
        triggers: [],
        goals: [],
        activities: [],
      },
    };
    
    const expectedJourney = {
      id: 'journey-123',
      key: 'test-journey-key',
      name: 'Test Journey',
      description: 'A test journey',
      status: 'Draft',
    };
    
    apiClientStub.createJourney.resolves(expectedJourney);

    protoStep.setData(Struct.fromJavaScript(journeyData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    
    // Verify createJourney was called with the correct data
    expect(apiClientStub.createJourney).to.have.been.calledWith(sinon.match({
      name: journeyData.name,
      description: journeyData.description,
      key: journeyData.key,
      ...journeyData.journey,
    }));
    
    // Check the records returned
    const records = response.getRecordsList();
    expect(records.length).to.equal(2);
    
    // Check first record
    const keyValue1 = records[0].getKeyValue();
    expect(keyValue1).to.not.be.undefined;
    if (keyValue1) {
      const record1Data = keyValue1.toJavaScript();
      expect(record1Data.id).to.equal(expectedJourney.id);
      expect(record1Data.key).to.equal(expectedJourney.key);
    }
  });

  it('should handle journey data with no description or key', async () => {
    const journeyData = {
      name: 'Test Journey',
      journey: {
        workflowApiVersion: 1.0,
      },
    };
    
    const expectedJourney = {
      id: 'journey-123',
      key: 'auto-generated-key',
      name: 'Test Journey',
      status: 'Draft',
    };
    
    apiClientStub.createJourney.resolves(expectedJourney);

    protoStep.setData(Struct.fromJavaScript(journeyData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    
    // Check the client was called with expected data
    const callArg = apiClientStub.createJourney.getCall(0).args[0];
    expect(callArg.name).to.equal(journeyData.name);
    expect(callArg.workflowApiVersion).to.equal(journeyData.journey.workflowApiVersion);
  });

  it('should respond with error if name is not provided', async () => {
    const journeyData = {
      description: 'A test journey',
      key: 'test-journey-key',
    };
    
    protoStep.setData(Struct.fromJavaScript(journeyData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.include('The name field is required');
  });

  it('should respond with error if API client throws error', async () => {
    const journeyData = {
      name: 'Test Journey',
      description: 'A test journey',
    };
    
    apiClientStub.createJourney.throws(new Error('API Error'));

    protoStep.setData(Struct.fromJavaScript(journeyData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('There was a problem creating the journey: %s');
  });
}); 