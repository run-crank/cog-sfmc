import * as fs from 'fs';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RunStepRequest } from '../../src/proto/cog_pb';
import { Cog } from '../../src/core/cog';
import { CogManifest } from '../../src/proto/cog_pb';
import { Metadata } from '@grpc/grpc-js';
import { Duplex } from 'stream';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';

chai.use(sinonChai);

describe('Cog:GetManifest', () => {
  const expect = chai.expect;
  let cogUnderTest: Cog;
  let clientWrapperStub: any;

  beforeEach(() => {
    clientWrapperStub = sinon.stub();
    cogUnderTest = new Cog(clientWrapperStub);
  });

  it('should return expected cog metadata', (done) => {
    const version: string = JSON.parse(fs.readFileSync('package.json').toString('utf8')).version;
    cogUnderTest.getManifest(null, (err, manifest: CogManifest) => {
      expect(manifest.getName()).to.equal('stackmoxie/sfmc');
      expect(manifest.getVersion()).to.equal(version);
      done();
    });
  });

  it('should return expected cog auth fields', (done) => {
    cogUnderTest.getManifest(null, (err, manifest: CogManifest) => {
      const authFields: any[] = manifest.getAuthFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      // Auth URL field
      const authUrl: any = authFields.filter(a => a.key === 'authUrl')[0];
      expect(authUrl.type).to.equal(FieldDefinition.Type.URL);
      expect(authUrl.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);

      // Client ID field
      const clientId: any = authFields.filter(a => a.key === 'clientId')[0];
      expect(clientId.type).to.equal(FieldDefinition.Type.STRING);
      expect(clientId.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);

      // Client Secret field
      const clientSecret: any = authFields.filter(a => a.key === 'clientSecret')[0];
      expect(clientSecret.type).to.equal(FieldDefinition.Type.STRING);
      expect(clientSecret.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);

      // Account Id field
      const accountId: any = authFields.filter(a => a.key === 'accountId')[0];
      expect(accountId.type).to.equal(FieldDefinition.Type.STRING);
      expect(accountId.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);

      done();
    });
  });

  it('should return expected step definitions', (done) => {
    cogUnderTest.getManifest(null, (err, manifest: CogManifest) => {
      const stepDefs: StepDefinition[] = manifest.getStepDefinitionsList();

      // Test for the presence of step definitions in your manifest like this:
      // const someStepExists: boolean = stepDefs.filter(s => s.getStepId() === 'SomeStepClass').length === 1;
      // expect(someStepExists).to.equal(true);

      done();
    });
  });

});

describe('Cog:RunStep', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let grpcUnaryCall: any = {};
  let step: any = {};
  let cogUnderTest: Cog;
  let clientWrapperStub: any;
  const redisClient: any = '';
  const requestId: string = '1';
  const scenarioId: string = '2';
  const requestorId: string = '3';

  beforeEach(() => {
    protoStep = new ProtoStep();
    protoStep.setData(Struct.fromJavaScript({
      connection: 'anyId',
    }));
    grpcUnaryCall.request = {
      getStep: function () {return protoStep},
      getRequestId () { return requestId; },
      getScenarioId () { return scenarioId; },
      getRequestorId () { return requestorId; },
      metadata: null
    };
    clientWrapperStub = sinon.stub();
    cogUnderTest = new Cog(clientWrapperStub, {}, redisClient);
  });

  it('bypasses caching with bad redisUrl', (done) => {
    // Construct grpc metadata and assert the client was authenticated.
    grpcUnaryCall.metadata = new Metadata();
    // The following are not real credentials:
    grpcUnaryCall.metadata.add('clientId', '12345678-abcd-1234-abcd-1234567890ab');
    grpcUnaryCall.metadata.add('clientSecret', 's6dL@%hf27U6bAL*M#5x123dCbR9kL4Xm');
    grpcUnaryCall.metadata.add('authUrl', 'https://mc563885gzs27c5t9-63k636ttgm.auth.marketingcloudapis.com/');
    grpcUnaryCall.metadata.add('accountId', '123');

    cogUnderTest.runStep(grpcUnaryCall, (err, response: RunStepResponse) => {
      expect(clientWrapperStub).to.have.not.been.called;
      done();
    }).catch(done);
  });

  it('responds with error when called with unknown stepId', (done) => {
    protoStep.setStepId('NotRealStep');

    cogUnderTest.runStep(grpcUnaryCall, (err, response: RunStepResponse) => {
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      expect(response.getMessageFormat()).to.equal('Unknown step %s');
      done();
    });
  });

  it('invokes step class as expected', (done) => {
    const expectedResponse = new RunStepResponse();
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.resolves(expectedResponse);
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);

    cogUnderTest = new Cog(clientWrapperStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');

    cogUnderTest.runStep(grpcUnaryCall, (err, response: RunStepResponse) => {
      expect(mockTestStepMap.TestStepId).to.have.been.calledOnce;
      expect(mockStepExecutor.executeStep).to.have.been.calledWith(protoStep);
      expect(response).to.deep.equal(expectedResponse);
      done();
    });
  });

  it('responds with error when step class throws an exception', (done) => {
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.throws()
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);

    cogUnderTest = new Cog(clientWrapperStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');

    cogUnderTest.runStep(grpcUnaryCall, (err, response: RunStepResponse) => {
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      done();
    });
  });

});

describe('Cog:RunSteps', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let runStepRequest: RunStepRequest;
  let grpcDuplexStream: any;
  let cogUnderTest: Cog;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    runStepRequest = new RunStepRequest();
    grpcDuplexStream = new Duplex({objectMode: true});
    grpcDuplexStream._write = sinon.stub().callsArg(2);
    grpcDuplexStream._read = sinon.stub();
    grpcDuplexStream.metadata = new Metadata();
    // The following are not real credentials:
    grpcDuplexStream.metadata.add('clientId', '12345678-abcd-1234-abcd-1234567890ab');
    grpcDuplexStream.metadata.add('clientSecret', 's6dL@%hf27U6bAL*M#5x123dCbR9kL4Xm');
    grpcDuplexStream.metadata.add('authUrl', 'https://mc563885gzs27c5t9-63k636ttgm.auth.marketingcloudapis.com/');
    grpcDuplexStream.metadata.add('accountId', '123');
    clientWrapperStub = sinon.stub();
    cogUnderTest = new Cog(clientWrapperStub);
  });

  it('bypasses caching with bad redisUrl', () => {
    runStepRequest.setStep(protoStep);

    // Construct grpc metadata and assert the client was authenticated.
    grpcDuplexStream.metadata.add('anythingReally', 'some-value');

    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);
    expect(clientWrapperStub).to.have.not.been.called;
});

  it('responds with error when called with unknown stepId', (done) => {
    // Construct step request
    protoStep.setStepId('NotRealStep');
    runStepRequest.setStep(protoStep);

    // Open the stream and write a request.
    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);

    // Allow the event loop to continue, then make assertions.
    setTimeout(() => {
      const result: RunStepResponse = grpcDuplexStream._write.lastCall.args[0];
      expect(result.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      expect(result.getMessageFormat()).to.equal('Unknown step %s');
      done();
    }, 1)
  });

  it('invokes step class as expected', (done) => {
    // Construct a mock step executor and request request
    const expectedResponse = new RunStepResponse();
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.resolves(expectedResponse);
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);
    cogUnderTest = new Cog(clientWrapperStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');
    runStepRequest.setStep(protoStep);

    // Open the stream and write a request.
    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);

    // Allow the event loop to continue, then make assertions.
    setTimeout(() => {
      expect(mockTestStepMap.TestStepId).to.have.been.calledOnce;
      expect(mockStepExecutor.executeStep).to.have.been.calledWith(protoStep);
      expect(grpcDuplexStream._write.lastCall.args[0]).to.deep.equal(expectedResponse);
      done();
    }, 1);
  });

  it('responds with error when step class throws an exception', (done) => {
    // Construct a mock step executor and request request
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.throws()
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);
    cogUnderTest = new Cog(clientWrapperStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');
    runStepRequest.setStep(protoStep);

    // Open the stream and write a request.
    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);

    // Allow the event loop to continue, then make assertions.
    setTimeout(() => {
      const response: RunStepResponse = grpcDuplexStream._write.lastCall.args[0];
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      done();
    });
  });

});
