import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RecordDefinition, StepRecord } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/contact/create-contact';

chai.use(sinonChai);

describe('CreateContact', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let apiClientStub: any;

  beforeEach(() => {
    apiClientStub = sinon.stub();
    apiClientStub.createContact = sinon.stub();
    stepUnderTest = new Step(apiClientStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CreateContact');
    expect(stepDef.getName()).to.equal('Create a SFMC contact');
    expect(stepDef.getExpression()).to.equal('create a sfmc contact');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // Contact field
    const contact: any = fields.filter(f => f.key === 'contact')[0];
    expect(contact.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(contact.type).to.equal(FieldDefinition.Type.MAP);
  });

  it('should return expected step records', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const records: any[] = stepDef.getExpectedRecordsList().map((record: RecordDefinition) => {
      return record.toObject();
    });

    // Contact record
    const contact: any = records.filter(r => r.id === 'contact')[0];
    expect(contact.type).to.equal(RecordDefinition.Type.KEYVALUE);
    expect(contact.mayHaveMoreFields).to.equal(true);

    // Contact record fields
    const contactKey: any = contact.guaranteedFieldsList.filter(f => f.key === 'contactKey')[0];
    expect(contactKey.type).to.equal(FieldDefinition.Type.STRING);

    const contactId: any = contact.guaranteedFieldsList.filter(f => f.key === 'contactId')[0];
    expect(contactId.type).to.equal(FieldDefinition.Type.NUMERIC);

    const operationStatus: any = contact.guaranteedFieldsList.filter(f => f.key === 'operationStatus')[0];
    expect(operationStatus.type).to.equal(FieldDefinition.Type.STRING);
  });

  it('should respond with pass if contact is created successfully', async () => {
    const expectedContact = {
      contactKey: 'test-contact-123',
      contactId: 123,
      operationStatus: 'success',
    };
    apiClientStub.createContact.resolves(expectedContact);

    protoStep.setData(Struct.fromJavaScript({
      contact: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    const records: StepRecord[] = response.getRecordsList();
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(records).to.have.lengthOf(2);
    expect(records[0].getId()).to.equal('contact');
    expect(records[0].getKeyValue().toJavaScript()).to.deep.equal(expectedContact);
    expect(records[1].getId()).to.equal('contact.1');
    expect(records[1].getKeyValue().toJavaScript()).to.deep.equal(expectedContact);
  });

  it('should respond with error if contact creation fails', async () => {
    apiClientStub.createContact.resolves(null);

    protoStep.setData(Struct.fromJavaScript({
      contact: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('Failed to create contact');
  });

  it('should respond with error if API client throws error', async () => {
    apiClientStub.createContact.throws(new Error('API Error'));

    protoStep.setData(Struct.fromJavaScript({
      contact: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('There was an error creating the contact: %s');
  });
}); 