import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RecordDefinition, StepRecord } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/journey/update-journey';

chai.use(sinonChai);

describe('UpdateJourney', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let apiClientStub: any;

  beforeEach(() => {
    apiClientStub = sinon.stub();
    apiClientStub.getJourneyById = sinon.stub();
    apiClientStub.getJourneyByKey = sinon.stub();
    apiClientStub.updateJourney = sinon.stub();
    stepUnderTest = new Step(apiClientStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('UpdateJourney');
    expect(stepDef.getName()).to.equal('Update a Salesforce Marketing Cloud journey');
    expect(stepDef.getExpression()).to.equal('update the salesforce marketing cloud journey with id (?<id>[a-zA-Z0-9_-]+)');
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

    // name field
    const name: any = fields.filter(f => f.key === 'name')[0];
    expect(name.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(name.type).to.equal(FieldDefinition.Type.STRING);

    // description field
    const description: any = fields.filter(f => f.key === 'description')[0];
    expect(description.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(description.type).to.equal(FieldDefinition.Type.STRING);

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
  });

  it('should respond with pass if journey is updated by ID', async () => {
    const journeyId = 'journey-123';
    const journeyData = {
      id: journeyId,
      name: 'Updated Journey',
      description: 'An updated journey',
    };
    
    const existingJourney = {
      id: journeyId,
      key: 'journey-key-123',
      name: 'Original Journey',
      description: 'Original description',
      status: 'Draft',
    };
    
    const updatedJourney = {
      ...existingJourney,
      name: journeyData.name,
      description: journeyData.description,
    };
    
    apiClientStub.getJourneyById.resolves(existingJourney);
    apiClientStub.getJourneyByKey.resolves(null);
    apiClientStub.updateJourney.resolves(updatedJourney);

    protoStep.setData(Struct.fromJavaScript(journeyData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    
    // Verify the journey was looked up by ID
    expect(apiClientStub.getJourneyById).to.have.been.calledWith(journeyId);
    
    // Verify updateJourney was called with correct parameters
    expect(apiClientStub.updateJourney).to.have.been.calledWith(
      existingJourney.id,
      sinon.match({
        ...existingJourney,
        name: journeyData.name,
        description: journeyData.description,
      })
    );
    
    // Check the records returned
    const records = response.getRecordsList();
    expect(records.length).to.equal(2);
    
    // Check first record
    const keyValue1 = records[0].getKeyValue();
    expect(keyValue1).to.not.be.undefined;
    if (keyValue1) {
      const record1Data = keyValue1.toJavaScript();
      expect(record1Data.id).to.equal(updatedJourney.id);
    }
  });

  it('should respond with pass if journey is updated by key', async () => {
    const journeyKey = 'journey-key-123';
    const journeyData = {
      id: journeyKey,
      name: 'Updated Journey',
    };
    
    const existingJourney = {
      id: 'journey-123',
      key: journeyKey,
      name: 'Original Journey',
      description: 'Original description',
      status: 'Draft',
    };
    
    const updatedJourney = {
      ...existingJourney,
      name: journeyData.name,
    };
    
    apiClientStub.getJourneyById.resolves(null);
    apiClientStub.getJourneyByKey.resolves(existingJourney);
    apiClientStub.updateJourney.resolves(updatedJourney);

    protoStep.setData(Struct.fromJavaScript(journeyData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    
    // Verify the journey was first looked up by ID, then by key
    expect(apiClientStub.getJourneyById).to.have.been.calledWith(journeyKey);
    expect(apiClientStub.getJourneyByKey).to.have.been.calledWith(journeyKey);
    
    // Verify updateJourney was called with correct parameters
    expect(apiClientStub.updateJourney).to.have.been.calledWith(
      existingJourney.id,
      sinon.match({
        ...existingJourney,
        name: journeyData.name,
      })
    );
  });

  it('should merge journey data if provided', async () => {
    const journeyId = 'journey-123';
    const journeyData = {
      id: journeyId,
      name: 'Updated Journey',
      journey: {
        workflowApiVersion: 2.0,
        triggers: [{ type: 'apiEvent' }],
      },
    };
    
    const existingJourney = {
      id: journeyId,
      key: 'journey-key-123',
      name: 'Original Journey',
      description: 'Original description',
      workflowApiVersion: 1.0,
      triggers: [],
      goals: [],
      activities: [],
      status: 'Draft',
    };
    
    apiClientStub.getJourneyById.resolves(existingJourney);
    apiClientStub.updateJourney.resolves({
      ...existingJourney,
      name: journeyData.name,
      workflowApiVersion: journeyData.journey.workflowApiVersion,
      triggers: journeyData.journey.triggers,
    });

    protoStep.setData(Struct.fromJavaScript(journeyData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    
    // Verify journey data was merged correctly
    const updateCall = apiClientStub.updateJourney.getCall(0);
    const updateData = updateCall.args[1];
    
    expect(updateData.name).to.equal(journeyData.name);
    expect(updateData.workflowApiVersion).to.equal(journeyData.journey.workflowApiVersion);
    expect(updateData.triggers).to.deep.equal(journeyData.journey.triggers);
    // Original fields should be preserved
    expect(updateData.description).to.equal(existingJourney.description);
    expect(updateData.goals).to.deep.equal(existingJourney.goals);
    expect(updateData.activities).to.deep.equal(existingJourney.activities);
  });

  it('should respond with fail if journey is not found', async () => {
    const journeyId = 'journey-123';
    const journeyData = {
      id: journeyId,
      name: 'Updated Journey',
    };
    
    apiClientStub.getJourneyById.resolves(null);
    apiClientStub.getJourneyByKey.resolves(null);

    protoStep.setData(Struct.fromJavaScript(journeyData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    expect(response.getMessageFormat()).to.equal('Journey %s not found');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(journeyId);
  });

  it('should respond with error if API client throws error', async () => {
    const journeyId = 'journey-123';
    const journeyData = {
      id: journeyId,
      name: 'Updated Journey',
    };
    
    const existingJourney = {
      id: journeyId,
      key: 'journey-key-123',
      name: 'Original Journey',
      status: 'Draft',
    };
    
    apiClientStub.getJourneyById.resolves(existingJourney);
    apiClientStub.updateJourney.throws(new Error('API Error'));

    protoStep.setData(Struct.fromJavaScript(journeyData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('There was a problem updating the journey: %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal('API Error');
  });
}); 