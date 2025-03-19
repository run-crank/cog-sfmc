import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RecordDefinition, StepRecord } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/contact/contact-field-equals';

chai.use(sinonChai);

describe('ContactFieldEquals', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let apiClientStub: any;

  beforeEach(() => {
    // An example of how you can stub/mock API client methods.
    apiClientStub = sinon.stub();
    apiClientStub.getContactByEmail = sinon.stub();
    stepUnderTest = new Step(apiClientStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('ContactFieldEquals');
    expect(stepDef.getName()).to.equal('Check a field on a SFMC contact');
    expect(!!stepDef.getHelp()).to.equal(false);
    expect(stepDef.getExpression()).to.equal('the (?<field>[a-zA-Z0-9_-]+) field on sfmc contact (?<email>.+\@.+\..+) should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // Field field
    const field: any = fields.filter(f => f.key === 'field')[0];
    expect(field.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(field.type).to.equal(FieldDefinition.Type.STRING);

    // Email field
    const email: any = fields.filter(f => f.key === 'email')[0];
    expect(email.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(email.type).to.equal(FieldDefinition.Type.EMAIL);

    // Expectation field
    const expectation: any = fields.filter(f => f.key === 'expectation')[0];
    expect(expectation.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(expectation.type).to.equal(FieldDefinition.Type.ANYSCALAR);
  });

  // TODO: Fix these tests
  // it('should return expected step records', () => {
  //   const stepDef: StepDefinition = stepUnderTest.getDefinition();
  //   const records: any[] = stepDef.getExpectedRecordsList().map((record: RecordDefinition) => {
  //     return record.toObject();
  //   });

  //   // User record
  //   const user: any = records.filter(r => r.id === 'contact')[0];
  //   expect(user.type).to.equal(RecordDefinition.Type.KEYVALUE);
  //   expect(user.mayHaveMoreFields).to.equal(true);

  //   // User record ID field
  //   const userId: any = user.guaranteedFieldsList.filter(f => f.key === 'id')[0];
  //   expect(userId.type).to.equal(FieldDefinition.Type.NUMERIC);

  //   // User record email field
  //   const userEmail: any = user.guaranteedFieldsList.filter(f => f.key === 'email')[0];
  //   expect(userEmail.type).to.equal(FieldDefinition.Type.EMAIL);
  // });

  // it('should respond with pass if API client resolves expected data', async () => {
  //   // Stub a response that matches expectations.
  //   const expectedUser: any = {someField: 'Expected Value'};
  //   apiClientStub.getContactByEmail.resolves({body: [expectedUser]})

  //   // Set step data corresponding to expectations
  //   protoStep.setData(Struct.fromJavaScript({
  //     field: 'someField',
  //     expectation: expectedUser.someField,
  //     email: 'anything@example.com',
  //     operator: 'be',
  //   }));

  //   const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
  //   const records: StepRecord[] = response.getRecordsList();
  //   expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  //   expect(records[0].getId()).to.equal('contact');
  //   expect(records[0].getKeyValue().toJavaScript()).to.deep.equal(expectedUser);
  // });

  // it('should respond with fail if API client resolves unexpected data', async () => {
  //   // Stub a response that does not match expectations.
  //   const expectedUser: any = {someField: 'Expected Value'};
  //   apiClientStub.getContactByEmail.resolves({body: [expectedUser]});

  //   // Set step data corresponding to expectations
  //   protoStep.setData(Struct.fromJavaScript({
  //     field: 'someField',
  //     expectation: `Not ${expectedUser.someField}`,
  //     email: 'anything@example.com',
  //     operator: 'be',
  //   }));

  //   const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
  //   const records: StepRecord[] = response.getRecordsList();
  //   expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  //   expect(records[0].getId()).to.equal('contact');
  //   expect(records[0].getKeyValue().toJavaScript()).to.deep.equal(expectedUser);
  // });

  // it('should respond with error if API client resolves no results', async () => {
  //   // Stub a response with no results in the body.
  //   apiClientStub.getContactByEmail.resolves({body: []});
  //   protoStep.setData(Struct.fromJavaScript({
  //     field: 'anyField',
  //     expectation: 'Any Value',
  //     email: 'anything@example.com',
  //     operator: 'be',
  //   }));

  //   const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
  //   expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  // });

  // it('should respond with error if resolved user does not contain given field', async () => {
  //   // Stub a response with valid response, but no expected field.
  //   const expectedUser: any = {someField: 'Expected Value'};
  //   apiClientStub.getContactByEmail.resolves({body: [expectedUser]});
  //   protoStep.setData(Struct.fromJavaScript({
  //     field: 'someOtherField',
  //     expectation: 'Any Value',
  //     email: 'anything@example.com',
  //     operator: 'be',
  //   }));

  //   const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
  //   const records: StepRecord[] = response.getRecordsList();
  //   expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  //   expect(records[0].getId()).to.equal('contact');
  //   expect(records[0].getKeyValue().toJavaScript()).to.deep.equal(expectedUser);
  // });

  // it('should respond with error if API client throws error', async () => {
  //   // Stub a response that throws any exception.
  //   apiClientStub.getContactByEmail.throws();
  //   protoStep.setData(Struct.fromJavaScript({
  //     operator: 'be',
  //   }));

  //   const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
  //   expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  // });

  it('should respond with error if expectation was not provided and operator is not either "be set" or "not be set"', async () => {
    protoStep.setData(Struct.fromJavaScript({
      field: 'email',
      email: 'anything@example.com',
      operator: 'be',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });
});
