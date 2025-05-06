import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RecordDefinition, StepRecord } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/journey/add-contact-to-journey';

chai.use(sinonChai);

describe('AddContactToJourney', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let apiClientStub: any;

  beforeEach(() => {
    apiClientStub = sinon.stub();
    apiClientStub.addContactToJourney = sinon.stub();
    stepUnderTest = new Step(apiClientStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('AddContactToJourney');
    expect(stepDef.getName()).to.equal('Add a contact to a Salesforce Marketing Cloud journey');
    expect(stepDef.getExpression()).to.equal('add the contact with key (?<contactKey>[a-zA-Z0-9_@.-]+) to salesforce marketing cloud journey (?<journeyKey>[a-zA-Z0-9_-]+)');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // contactKey field
    const contactKey: any = fields.filter(f => f.key === 'contactKey')[0];
    expect(contactKey.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(contactKey.type).to.equal(FieldDefinition.Type.STRING);

    // journeyKey field
    const journeyKey: any = fields.filter(f => f.key === 'journeyKey')[0];
    expect(journeyKey.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(journeyKey.type).to.equal(FieldDefinition.Type.STRING);

    // data field
    const data: any = fields.filter(f => f.key === 'data')[0];
    expect(data.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(data.type).to.equal(FieldDefinition.Type.MAP);
  });

  it('should return expected step records', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const records: any[] = stepDef.getExpectedRecordsList().map((record: RecordDefinition) => {
      return record.toObject();
    });

    // journeyEntry record
    const journeyEntry: any = records.filter(r => r.id === 'journeyEntry')[0];
    expect(journeyEntry.type).to.equal(RecordDefinition.Type.KEYVALUE);
    expect(journeyEntry.mayHaveMoreFields).to.equal(true);

    // success field
    const success = journeyEntry.guaranteedFieldsList.filter(f => f.key === 'success')[0];
    expect(success.type).to.equal(FieldDefinition.Type.BOOLEAN);
  });

  it('should respond with pass if contact is added to journey successfully', async () => {
    const contactKey = 'contact-123';
    const journeyKey = 'journey-key-123';
    const result = {
      success: true,
      requestId: 'req-123',
      timestamp: new Date().toISOString(),
    };

    // Setup stubs
    apiClientStub.addContactToJourney.resolves(result);

    protoStep.setData(Struct.fromJavaScript({
      contactKey,
      journeyKey,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);

    // Verify client method was called with expected arguments
    expect(apiClientStub.addContactToJourney).to.have.been.calledWith(journeyKey, contactKey, {});

    // Check message format and args
    expect(response.getMessageFormat()).to.equal('Successfully added contact %s to journey %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.equal(contactKey);
    expect(response.getMessageArgsList()[1].getStringValue()).to.equal(journeyKey);

    // Verify the record data
    const record = response.getRecordsList()[0];
    expect(record.getId()).to.equal('journeyEntry');

    const keyValue = record.getKeyValue();
    expect(keyValue).to.not.be.undefined;
    if (keyValue) {
      const recordData = keyValue.toJavaScript();
      expect(recordData.success).to.equal(result.success);
      expect(recordData.requestId).to.equal(result.requestId);
      expect(recordData.timestamp).to.equal(result.timestamp);
    }
  });

  it('should pass additional data to journey when provided', async () => {
    const contactKey = 'contact-123';
    const journeyKey = 'journey-key-123';
    const additionalData = {
      FirstName: 'John',
      LastName: 'Doe',
      Email: 'john.doe@example.com',
    };
    const result = {
      success: true,
    };

    // Setup stubs
    apiClientStub.addContactToJourney.resolves(result);

    protoStep.setData(Struct.fromJavaScript({
      contactKey,
      journeyKey,
      data: additionalData,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);

    // Verify client method was called with expected arguments and data
    expect(apiClientStub.addContactToJourney).to.have.been.calledWith(journeyKey, contactKey, additionalData);
  });

  it('should respond with error if an exception is thrown', async () => {
    const contactKey = 'contact-123';
    const journeyKey = 'journey-key-123';

    // Setup stubs
    apiClientStub.addContactToJourney.throws(new Error('API Error'));

    protoStep.setData(Struct.fromJavaScript({
      contactKey,
      journeyKey,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);

    // Check message format
    expect(response.getMessageFormat()).to.equal('There was a problem adding the contact to the journey: %s');
    expect(response.getMessageArgsList()[0].getStringValue()).to.include('API Error');
  });

  it('should handle empty data object correctly', async () => {
    const contactKey = 'contact-123';
    const journeyKey = 'journey-key-123';
    const result = {
      success: true,
    };

    // Setup stubs
    apiClientStub.addContactToJourney.resolves(result);

    protoStep.setData(Struct.fromJavaScript({
      contactKey,
      journeyKey,
      data: {},
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);

    // Verify client method was called with expected arguments and empty data object
    expect(apiClientStub.addContactToJourney).to.have.been.calledWith(journeyKey, contactKey, {});
  });
});
