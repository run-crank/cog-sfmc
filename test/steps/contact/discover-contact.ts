import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RecordDefinition, StepRecord } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/contact/discover-contact';

chai.use(sinonChai);

describe('DiscoverContact', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let apiClientStub: any;

  beforeEach(() => {
    apiClientStub = sinon.stub();
    apiClientStub.getContact = sinon.stub();
    stepUnderTest = new Step(apiClientStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('DiscoverContact');
    expect(stepDef.getName()).to.equal('Discover fields on a SFMC contact');
    expect(stepDef.getExpression()).to.equal('discover fields on the sfmc contact with key (?<contactKey>.+)');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // ContactKey field
    const contactKey: any = fields.filter(f => f.key === 'contactKey')[0];
    expect(contactKey.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(contactKey.type).to.equal(FieldDefinition.Type.STRING);
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

    const contactStatus: any = contact.guaranteedFieldsList.filter(f => f.key === 'contactStatus')[0];
    expect(contactStatus.type).to.equal(FieldDefinition.Type.STRING);
  });

  it('should respond with pass if contact is discovered successfully', async () => {
    const contactKey = 'test-contact-123';
    const expectedContact = {
      contactKey,
      contactID: 123, // Note: using contactID to match the API response format
      contactStatus: 'Active',
      modifiedDate: '2023-01-01',
    };
    apiClientStub.getContact.resolves(expectedContact);

    protoStep.setData(Struct.fromJavaScript({
      contactKey,
      __stepOrder: 1,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    
    // Check the number of records returned (should be 2 - one regular and one ordered)
    const records = response.getRecordsList();
    expect(records.length).to.equal(2);
    
    // Verify the first record (contact)
    expect(records[0].getId()).to.equal('exposeOnPass:contact');
    
    // Safe access the record data
    const keyValue1 = records[0].getKeyValue();
    expect(keyValue1).to.not.be.undefined;
    if (keyValue1) {
      const record1Data = keyValue1.toJavaScript();
      expect(record1Data.contactKey).to.equal(contactKey);
      expect(record1Data.contactId).to.equal(expectedContact.contactID); // Note: contactID is mapped to contactId
      expect(record1Data.contactStatus).to.equal(expectedContact.contactStatus);
    }
    
    // Verify the second record (contact.1)
    expect(records[1].getId()).to.equal('contact.1');
    
    // Safe access the record data
    const keyValue2 = records[1].getKeyValue();
    expect(keyValue2).to.not.be.undefined;
    if (keyValue2) {
      const record2Data = keyValue2.toJavaScript();
      expect(record2Data.contactKey).to.equal(contactKey);
      expect(record2Data.contactId).to.equal(expectedContact.contactID); // Note: contactID is mapped to contactId
      expect(record2Data.contactStatus).to.equal(expectedContact.contactStatus);
    }
  });

  it('should respond with fail if contact is not found', async () => {
    const contactKey = 'test-contact-123';
    apiClientStub.getContact.resolves(null);

    protoStep.setData(Struct.fromJavaScript({
      contactKey,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    expect(response.getMessageFormat()).to.equal('No contact found with key %s');
  });

  it('should respond with error if API client throws error', async () => {
    const contactKey = 'test-contact-123';
    apiClientStub.getContact.throws(new Error('API Error'));

    protoStep.setData(Struct.fromJavaScript({
      contactKey,
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal('There was an error checking the contact: %s');
  });
}); 